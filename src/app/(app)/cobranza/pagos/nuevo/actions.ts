"use server";

import { redirect } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hoyCaracas } from "@/lib/format";
import { procesarPago } from "@/lib/pagos";
import { subirComprobante } from "@/lib/comprobantes";

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

  let comprobanteUrl = "";
  const foto = formData.get("comprobante_foto");
  if (foto instanceof File && foto.size > 0) {
    const subida = await subirComprobante(foto);
    if ("error" in subida) return subida;
    comprobanteUrl = subida.url;
  }

  const resultado = await procesarPago(supabase, {
    matriculaId: String(formData.get("matricula_id") ?? ""),
    fechaPago: String(formData.get("fecha_pago") ?? ""),
    tasaBcv: Number(formData.get("tasa_bcv")),
    monedaPago: String(formData.get("moneda_pago") ?? "BS"),
    montoIngresado: Number(formData.get("monto")),
    metodo: String(formData.get("metodo") ?? ""),
    referencia: String(formData.get("referencia") ?? "").trim(),
    comprobanteUrl,
    conceptoIds: formData.getAll("concepto_id").map(String),
    registradoPorPerfilId: perfil.id,
  });

  if ("error" in resultado) return resultado;

  redirect(`/cobranza/pagos/${resultado.pagoId}/recibo`);
}
