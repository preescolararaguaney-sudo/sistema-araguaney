"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { procesarPago } from "@/lib/pagos";
import { hoyCaracas } from "@/lib/format";

export type ActionState = { error?: string } | undefined;

export type TasaBcvResultado = { tasa: number; fecha: string } | { error: string };

export async function obtenerTasaBcvActualPublico(): Promise<TasaBcvResultado> {
  const admin = createAdminClient();

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

  const { error } = await admin
    .from("tasas_bcv")
    .upsert({ fecha, tasa, fuente: "bcv.org.ve (vía dolarapi.com)" }, { onConflict: "fecha" });

  if (error) {
    return { error: `Se obtuvo la tasa (${tasa}) pero no se pudo guardar: ${error.message}` };
  }

  return { tasa, fecha };
}

export async function registrarPagoPublico(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = createAdminClient();

  const cobradoPor = String(formData.get("cobrado_por") ?? "").trim();
  if (!cobradoPor) {
    return { error: "Escribe tu nombre en \"Cobrado por\" antes de registrar el pago." };
  }

  const resultado = await procesarPago(admin, {
    matriculaId: String(formData.get("matricula_id") ?? ""),
    fechaPago: String(formData.get("fecha_pago") ?? ""),
    tasaBcv: Number(formData.get("tasa_bcv")),
    monedaPago: String(formData.get("moneda_pago") ?? "BS"),
    montoIngresado: Number(formData.get("monto")),
    metodo: String(formData.get("metodo") ?? ""),
    referencia: String(formData.get("referencia") ?? "").trim(),
    comprobanteUrl: String(formData.get("comprobante_url") ?? "").trim(),
    registradoPorNombre: cobradoPor,
  });

  if ("error" in resultado) return resultado;

  redirect(`/pagos-publico/recibo/${resultado.pagoId}`);
}
