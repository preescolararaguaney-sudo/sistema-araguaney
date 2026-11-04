import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { factorDeCuota, getFactoresBs, SIN_RECARGO } from "@/lib/precios-bs";

export type ResultadoPago = { pagoId: string } | { error: string };

export type DatosFacturaPago = {
  nombre?: string | null;
  cedula?: string | null;
  telefono?: string | null;
  direccion?: string | null;
};

export type RegistrarPagoInput = {
  matriculaId: string;
  fechaPago: string;
  tasaBcv: number;
  monedaPago: string;
  montoIngresado: number;
  metodo: string;
  referencia: string;
  comprobanteUrl: string;
  // Conceptos (plan_pago_items) a los que se aplica este pago, elegidos a
  // mano por quien registra — antes se aplicaba siempre a la cuota más
  // antigua pendiente sin importar para qué dijera el representante que
  // era el pago, lo cual no coincidía con la realidad (ej. un abono a
  // matrícula terminaba aplicado a una mensualidad anterior).
  conceptoIds: string[];
  // Exactamente una de las dos identifica quién registró el pago (ver
  // constraint chk_pago_tiene_registrador en la migración): un perfil real
  // desde dentro del sistema, o un nombre tecleado a mano desde
  // /pagos-publico (sin login).
  registradoPorPerfilId?: string | null;
  registradoPorNombre?: string | null;
  // Opcionales: banco del comprobante y a quién se le factura (el pago es el
  // registro único, venga de Telegram, del formulario público o de la carga manual).
  banco?: string | null;
  factura?: DatosFacturaPago;
};

// Los montos en Bs se redondean a centavos de dólar; esta holgura evita rechazar
// un pago por la diferencia de céntimos de ese redondeo.
const TOLERANCIA_USD = 0.5;
const redondear = (n: number) => Math.round(n * 100) / 100;

/**
 * Lógica de negocio de "registrar un pago" (regla de doble moneda, asignación
 * greedy a las cuotas más antiguas primero). Se usa tanto desde el flujo
 * interno (`/cobranza/pagos/nuevo`, con el cliente normal ligado a RLS) como
 * desde el público (`/pagos-publico`, con el cliente admin/service-role) —
 * ambos deben calcular exactamente igual, así que vive en un solo lugar.
 *
 * Regla de precios: la mensualidad vale $130 en dólares y $150 en bolívares.
 * Un pago en Bs equivalente a X USD (al BCV del día) descuenta X × (130 ÷ 150)
 * de la cuota; uno en dólares descuenta X completo. Ver `precios-bs.ts`.
 */
export async function procesarPago(
  supabase: SupabaseClient,
  input: RegistrarPagoInput,
): Promise<ResultadoPago> {
  const {
    matriculaId,
    fechaPago,
    tasaBcv,
    monedaPago,
    montoIngresado,
    metodo,
    referencia,
    comprobanteUrl,
    conceptoIds,
    registradoPorPerfilId,
    registradoPorNombre,
    banco,
    factura,
  } = input;

  if (!matriculaId || !fechaPago || !metodo) {
    return { error: "Faltan datos del pago." };
  }
  if (!tasaBcv || tasaBcv <= 0) {
    return { error: "Indica la tasa BCV del día (mayor a 0)." };
  }
  if (!montoIngresado || montoIngresado <= 0) {
    return { error: "Indica un monto a pagar mayor a 0." };
  }
  if (monedaPago !== "BS" && monedaPago !== "USD") {
    return { error: "Indica en qué moneda se recibió el pago." };
  }
  if (!registradoPorPerfilId && !registradoPorNombre?.trim()) {
    return { error: "Falta indicar quién registró el pago." };
  }
  if (!conceptoIds || conceptoIds.length === 0) {
    return { error: "Selecciona a qué concepto(s) se aplica este pago." };
  }

  const enBs = monedaPago === "BS";

  // El monto SIEMPRE se guarda en USD (regla de negocio): si el representante
  // pagó en bolívares, se convierte con la tasa del día antes de continuar.
  const montoUsdTotal = enBs
    ? redondear(montoIngresado / tasaBcv)
    : redondear(montoIngresado);

  const { data: cuotas, error: errorCuotas } = await supabase
    .from("plan_pago_items")
    .select("id, tipo, monto_usd, monto_usd_pagado")
    .eq("matricula_id", matriculaId)
    .in("id", conceptoIds)
    .neq("estado", "pagado")
    .order("fecha_vencimiento", { ascending: true });

  if (errorCuotas || !cuotas) {
    return { error: "No se pudieron leer los conceptos seleccionados." };
  }
  if (cuotas.length === 0) {
    return { error: "Los conceptos seleccionados ya no están pendientes. Actualiza la página." };
  }

  // Un pago en dólares no tiene recargo; uno en bolívares sí (según el precio del concepto).
  const factores = enBs ? await getFactoresBs(supabase, matriculaId) : SIN_RECARGO;

  const saldos = cuotas.map((c) => {
    const saldo = Number(c.monto_usd) - Number(c.monto_usd_pagado);
    const factor = factorDeCuota(c.tipo, factores);
    // Cuántos USD (a precio de la moneda del pago) hacen falta para saldar la cuota.
    return { id: c.id, saldo, factor, necesita: saldo / factor };
  });
  const totalNecesario = saldos.reduce((acc, s) => acc + s.necesita, 0);

  if (montoUsdTotal > totalNecesario + TOLERANCIA_USD) {
    return {
      error: `El monto excede lo pendiente de los conceptos seleccionados (máximo ${redondear(totalNecesario).toFixed(2)} USD${enBs ? " pagando en bolívares" : ""}).`,
    };
  }

  const { data: tasaRow, error: errorTasa } = await supabase
    .from("tasas_bcv")
    .upsert(
      { fecha: fechaPago, tasa: tasaBcv, creado_por: registradoPorPerfilId ?? null },
      { onConflict: "fecha" },
    )
    .select("id")
    .single();

  if (errorTasa || !tasaRow) {
    return { error: `No se pudo registrar la tasa BCV: ${errorTasa?.message}` };
  }

  const { data: pago, error: errorPago } = await supabase
    .from("pagos")
    .insert({
      matricula_id: matriculaId,
      fecha_pago: fechaPago,
      monto_usd_total: montoUsdTotal,
      tasa_bcv_id: tasaRow.id,
      tasa_bcv_valor: tasaBcv,
      metodo,
      referencia: referencia || null,
      comprobante_url: comprobanteUrl || null,
      registrado_por: registradoPorPerfilId ?? null,
      registrado_por_nombre: registradoPorNombre?.trim() || null,
      moneda_pago: monedaPago,
      monto_bs_pagado: enBs ? redondear(montoIngresado) : null,
      banco: banco?.trim() || null,
      factura_nombre: factura?.nombre?.trim() || null,
      factura_cedula: factura?.cedula?.trim() || null,
      factura_telefono: factura?.telefono?.trim() || null,
      factura_direccion: factura?.direccion?.trim() || null,
    })
    .select("id")
    .single();

  if (errorPago || !pago) {
    return { error: `No se pudo registrar el pago: ${errorPago?.message}` };
  }

  // Asignación greedy: cubre las cuotas más antiguas primero (abono/pago parcial).
  // `restante` está en USD a precio de la moneda del pago; el crédito que recibe
  // cada cuota es ese monto × su factor (130 ÷ 150 si fue en Bs).
  let restante = montoUsdTotal;
  const aplicaciones: { pago_id: string; plan_item_id: string; monto_usd_aplicado: number }[] = [];
  for (const s of saldos) {
    if (restante <= 0.001) break;
    const usd = Math.min(s.necesita, restante);
    const completa = usd >= s.necesita - 0.005;
    const credito = completa ? redondear(s.saldo) : redondear(usd * s.factor);
    if (credito > 0.001) {
      aplicaciones.push({ pago_id: pago.id, plan_item_id: s.id, monto_usd_aplicado: credito });
    }
    restante -= usd;
  }

  const { error: errorAplicaciones } = await supabase
    .from("pago_aplicaciones")
    .insert(aplicaciones);

  if (errorAplicaciones) {
    return { error: `El pago se registró pero falló aplicarlo a las cuotas: ${errorAplicaciones.message}` };
  }

  return { pagoId: pago.id };
}
