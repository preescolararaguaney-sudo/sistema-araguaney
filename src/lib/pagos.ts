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
  // Pago de algo que no es una cuota del plan (insignia, fiesta...): se registra y se
  // factura, pero no descuenta deuda. Si hay cuotas elegidas, es solo una nota.
  conceptoLibre?: string | null;
  // Reparto manual del monto entre los conceptos elegidos, en USD a precio de la moneda
  // del pago. Sin esto el monto se aplica de la cuota más antigua a la más nueva.
  asignaciones?: { conceptoId: string; montoUsd: number }[];
  // Regla del colegio: quien paga un mes ya pagó los anteriores. Se asientan como pagados
  // los meses anteriores al más antiguo de este pago (pago sintético marcado es_historial).
  darPorPagadosAnteriores?: boolean;
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
    asignaciones,
    darPorPagadosAnteriores,
  } = input;
  const conceptoLibre = input.conceptoLibre?.trim() || null;

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
  const sinCuotas = !conceptoIds || conceptoIds.length === 0;
  if (sinCuotas && !conceptoLibre) {
    return { error: "Selecciona a qué concepto(s) se aplica este pago, o escribe el concepto si no es una cuota." };
  }

  const enBs = monedaPago === "BS";

  // El monto SIEMPRE se guarda en USD (regla de negocio): si el representante
  // pagó en bolívares, se convierte con la tasa del día antes de continuar.
  const montoUsdTotal = enBs
    ? redondear(montoIngresado / tasaBcv)
    : redondear(montoIngresado);

  // ---- Qué se aplica a cada cuota (vacío si es un concepto libre) ----
  type Aplicacion = { plan_item_id: string; monto_usd_aplicado: number };
  const aplicaciones: Aplicacion[] = [];
  let mesMasAntiguo: string | null = null;

  if (!sinCuotas) {
    const { data: cuotas, error: errorCuotas } = await supabase
      .from("plan_pago_items")
      .select("id, tipo, descripcion, mes_referencia, monto_usd, monto_usd_pagado")
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
      return { id: c.id, descripcion: c.descripcion as string, saldo, factor, necesita: saldo / factor };
    });

    const repartoManual = (asignaciones ?? []).filter((a) => a.montoUsd > 0.001);
    const totalNecesario = saldos.reduce((acc, s) => acc + s.necesita, 0);

    if (repartoManual.length > 0) {
      // Reparto indicado a mano: cada concepto recibe exactamente lo que se escribió.
      const porId = new Map(saldos.map((s) => [s.id, s]));
      const suma = repartoManual.reduce((acc, a) => acc + a.montoUsd, 0);
      if (Math.abs(suma - montoUsdTotal) > TOLERANCIA_USD) {
        return {
          error: `Lo repartido (${redondear(suma).toFixed(2)} USD) no coincide con el monto del pago (${montoUsdTotal.toFixed(2)} USD).`,
        };
      }
      for (const a of repartoManual) {
        const s = porId.get(a.conceptoId);
        if (!s) return { error: "El reparto incluye un concepto que no está seleccionado." };
        if (a.montoUsd > s.necesita + TOLERANCIA_USD) {
          return {
            error: `Lo asignado a "${s.descripcion}" (${a.montoUsd.toFixed(2)} USD) excede lo que falta (${redondear(s.necesita).toFixed(2)} USD${enBs ? " pagando en bolívares" : ""}).`,
          };
        }
        const completa = a.montoUsd >= s.necesita - 0.005;
        const credito = completa ? redondear(s.saldo) : redondear(a.montoUsd * s.factor);
        if (credito > 0.001) aplicaciones.push({ plan_item_id: s.id, monto_usd_aplicado: credito });
      }
    } else {
      if (montoUsdTotal > totalNecesario + TOLERANCIA_USD) {
        return {
          error: `El monto excede lo pendiente de los conceptos seleccionados (máximo ${redondear(totalNecesario).toFixed(2)} USD${enBs ? " pagando en bolívares" : ""}).`,
        };
      }
      // Asignación greedy: cubre las cuotas más antiguas primero (abono/pago parcial).
      // `restante` está en USD a precio de la moneda del pago; el crédito que recibe
      // cada cuota es ese monto × su factor (130 ÷ 150 si fue en Bs).
      let restante = montoUsdTotal;
      for (const s of saldos) {
        if (restante <= 0.001) break;
        const usd = Math.min(s.necesita, restante);
        const completa = usd >= s.necesita - 0.005;
        const credito = completa ? redondear(s.saldo) : redondear(usd * s.factor);
        if (credito > 0.001) aplicaciones.push({ plan_item_id: s.id, monto_usd_aplicado: credito });
        restante -= usd;
      }
    }

    // Mes más antiguo de las mensualidades a las que se aplica el pago (base de "meses anteriores").
    const aplicadas = new Set(aplicaciones.map((a) => a.plan_item_id));
    for (const c of cuotas) {
      if (c.tipo === "mensualidad" && c.mes_referencia && aplicadas.has(c.id)) {
        const mes = String(c.mes_referencia);
        if (!mesMasAntiguo || mes < mesMasAntiguo) mesMasAntiguo = mes;
      }
    }
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
      concepto_libre: conceptoLibre,
    })
    .select("id")
    .single();

  if (errorPago || !pago) {
    return { error: `No se pudo registrar el pago: ${errorPago?.message}` };
  }

  if (aplicaciones.length > 0) {
    const { error: errorAplicaciones } = await supabase
      .from("pago_aplicaciones")
      .insert(aplicaciones.map((a) => ({ ...a, pago_id: pago.id })));

    if (errorAplicaciones) {
      return { error: `El pago se registró pero falló aplicarlo a las cuotas: ${errorAplicaciones.message}` };
    }
  }

  if (darPorPagadosAnteriores && mesMasAntiguo) {
    await asentarMesesAnteriores(supabase, {
      matriculaId,
      antesDeMes: mesMasAntiguo,
      fechaPago,
      tasaBcv,
      tasaBcvId: tasaRow.id,
    });
  }

  return { pagoId: pago.id };
}

/**
 * Regla del colegio: quien registra un pago de un mes ya pagó los anteriores. Las
 * mensualidades anteriores que sigan pendientes se asientan como pagadas con un pago
 * sintético (es_historial), que no cuenta como dinero recibido. Si algo falla no se
 * interrumpe el pago real: solo queda el mes pendiente para revisarlo a mano.
 */
async function asentarMesesAnteriores(
  supabase: SupabaseClient,
  ctx: { matriculaId: string; antesDeMes: string; fechaPago: string; tasaBcv: number; tasaBcvId: string },
): Promise<void> {
  const { data: previas } = await supabase
    .from("plan_pago_items")
    .select("id, monto_usd, monto_usd_pagado")
    .eq("matricula_id", ctx.matriculaId)
    .eq("tipo", "mensualidad")
    .neq("estado", "pagado")
    .lt("mes_referencia", ctx.antesDeMes);

  const pendientes = (previas ?? [])
    .map((p) => ({ id: p.id as string, saldo: redondear(Number(p.monto_usd) - Number(p.monto_usd_pagado)) }))
    .filter((p) => p.saldo > 0.001);
  if (pendientes.length === 0) return;

  const total = redondear(pendientes.reduce((acc, p) => acc + p.saldo, 0));
  const { data: historial, error } = await supabase
    .from("pagos")
    .insert({
      matricula_id: ctx.matriculaId,
      fecha_pago: ctx.fechaPago,
      monto_usd_total: total,
      tasa_bcv_id: ctx.tasaBcvId,
      tasa_bcv_valor: ctx.tasaBcv,
      metodo: "otro",
      referencia: "HISTORIAL",
      registrado_por_nombre: "Historial previo al sistema (se asumió pagado)",
      moneda_pago: "USD",
      es_historial: true,
    })
    .select("id")
    .single();
  if (error || !historial) {
    console.error("No se pudieron asentar los meses anteriores:", error?.message);
    return;
  }

  const { error: errorAplicaciones } = await supabase.from("pago_aplicaciones").insert(
    pendientes.map((p) => ({ pago_id: historial.id, plan_item_id: p.id, monto_usd_aplicado: p.saldo })),
  );
  if (errorAplicaciones) console.error("No se pudieron aplicar los meses anteriores:", errorAplicaciones.message);
}
