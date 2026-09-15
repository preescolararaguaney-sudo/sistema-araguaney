import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ResultadoPago = { pagoId: string } | { error: string };

export type RegistrarPagoInput = {
  matriculaId: string;
  fechaPago: string;
  tasaBcv: number;
  monedaPago: string;
  montoIngresado: number;
  metodo: string;
  referencia: string;
  comprobanteUrl: string;
  // Exactamente una de las dos identifica quién registró el pago (ver
  // constraint chk_pago_tiene_registrador en la migración): un perfil real
  // desde dentro del sistema, o un nombre tecleado a mano desde
  // /pagos-publico (sin login).
  registradoPorPerfilId?: string | null;
  registradoPorNombre?: string | null;
};

/**
 * Lógica de negocio de "registrar un pago" (regla de doble moneda, asignación
 * greedy a las cuotas más antiguas primero). Se usa tanto desde el flujo
 * interno (`/cobranza/pagos/nuevo`, con el cliente normal ligado a RLS) como
 * desde el público (`/pagos-publico`, con el cliente admin/service-role) —
 * ambos deben calcular exactamente igual, así que vive en un solo lugar.
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
    registradoPorPerfilId,
    registradoPorNombre,
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

  // El monto SIEMPRE se guarda en USD (regla de negocio): si el representante
  // pagó en bolívares, se convierte con la tasa del día antes de continuar.
  const montoUsdTotal =
    monedaPago === "BS"
      ? Math.round((montoIngresado / tasaBcv) * 100) / 100
      : Math.round(montoIngresado * 100) / 100;

  const { data: cuotas, error: errorCuotas } = await supabase
    .from("plan_pago_items")
    .select("id, monto_usd, monto_usd_pagado")
    .eq("matricula_id", matriculaId)
    .neq("estado", "pagado")
    .order("fecha_vencimiento", { ascending: true });

  if (errorCuotas || !cuotas) {
    return { error: "No se pudieron leer las cuotas pendientes." };
  }

  const saldos = cuotas.map((c) => ({
    id: c.id,
    saldo: Number(c.monto_usd) - Number(c.monto_usd_pagado),
  }));
  const totalPendiente = saldos.reduce((acc, s) => acc + s.saldo, 0);

  if (montoUsdTotal > totalPendiente + 0.01) {
    return {
      error: `El monto excede lo pendiente de este alumno (máximo ${totalPendiente.toFixed(2)} USD).`,
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
    })
    .select("id")
    .single();

  if (errorPago || !pago) {
    return { error: `No se pudo registrar el pago: ${errorPago?.message}` };
  }

  // Asignación greedy: cubre las cuotas más antiguas primero (abono/pago parcial).
  let restante = montoUsdTotal;
  const aplicaciones: { pago_id: string; plan_item_id: string; monto_usd_aplicado: number }[] = [];
  for (const s of saldos) {
    if (restante <= 0.001) break;
    const aplicar = Math.min(s.saldo, restante);
    if (aplicar > 0.001) {
      aplicaciones.push({
        pago_id: pago.id,
        plan_item_id: s.id,
        monto_usd_aplicado: Math.round(aplicar * 100) / 100,
      });
      restante -= aplicar;
    }
  }

  const { error: errorAplicaciones } = await supabase
    .from("pago_aplicaciones")
    .insert(aplicaciones);

  if (errorAplicaciones) {
    return { error: `El pago se registró pero falló aplicarlo a las cuotas: ${errorAplicaciones.message}` };
  }

  return { pagoId: pago.id };
}
