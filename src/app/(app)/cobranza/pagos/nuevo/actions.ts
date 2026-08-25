"use server";

import { redirect } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hoyCaracas } from "@/lib/format";

export type ActionState = { error?: string } | undefined;

export type TasaBcvResultado = { tasa: number; fecha: string } | { error: string };

// El BCV no tiene API oficial (y su sitio tiene un certificado que la mayoría
// de los clientes no pueden verificar), así que se consulta un espejo
// conocido de la tasa oficial. Es un mecanismo opcional de conveniencia: el
// usuario siempre puede editar la tasa a mano antes de confirmar el pago.
export async function obtenerTasaBcvActual(): Promise<TasaBcvResultado> {
  const perfil = await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  let tasa: number;
  try {
    const res = await fetch("https://ve.dolarapi.com/v1/dolares/oficial", {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    tasa = Number(data.promedio);
    if (!tasa || tasa <= 0) throw new Error("respuesta inválida");
  } catch {
    return { error: "No se pudo consultar la tasa BCV automáticamente. Ingrésala manualmente." };
  }

  const fecha = hoyCaracas();

  const { error } = await supabase
    .from("tasas_bcv")
    .upsert(
      { fecha, tasa, fuente: "bcv.org.ve (vía dolarapi.com)", creado_por: perfil.id },
      { onConflict: "fecha" },
    );

  if (error) {
    return { error: `Se obtuvo la tasa (${tasa}) pero no se pudo guardar: ${error.message}` };
  }

  return { tasa, fecha };
}

export async function registrarPago(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const matriculaId = String(formData.get("matricula_id") ?? "");
  const fechaPago = String(formData.get("fecha_pago") ?? "");
  const tasaBcv = Number(formData.get("tasa_bcv"));
  const monedaPago = String(formData.get("moneda_pago") ?? "BS");
  const montoIngresado = Number(formData.get("monto"));
  const metodo = String(formData.get("metodo") ?? "");
  const referencia = String(formData.get("referencia") ?? "").trim();
  const comprobanteUrl = String(formData.get("comprobante_url") ?? "").trim();

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
      { fecha: fechaPago, tasa: tasaBcv, creado_por: perfil.id },
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
      registrado_por: perfil.id,
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

  redirect(`/cobranza/pagos/${pago.id}/recibo`);
}
