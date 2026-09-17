"use server";

import { revalidatePath } from "next/cache";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { subirComprobante } from "@/lib/comprobantes";

export type ActionState = { error?: string } | undefined;

export async function anularPago(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const pagoId = String(formData.get("pago_id") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!pagoId || !motivo) {
    return { error: "Indica el motivo de la anulación." };
  }

  const { error } = await supabase
    .from("pagos")
    .update({ anulado: true, motivo_anulacion: motivo })
    .eq("id", pagoId)
    .eq("anulado", false);

  if (error) {
    return { error: `No se pudo anular el pago: ${error.message}` };
  }

  revalidatePath(`/cobranza/pagos/${pagoId}/recibo`);
  return undefined;
}

export async function actualizarComprobante(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const pagoId = String(formData.get("pago_id") ?? "");
  const foto = formData.get("comprobante_foto");
  if (!pagoId || !(foto instanceof File) || foto.size === 0) {
    return { error: "Selecciona una imagen o PDF del comprobante." };
  }

  const subida = await subirComprobante(foto);
  if ("error" in subida) return subida;

  const { error } = await supabase
    .from("pagos")
    .update({ comprobante_url: subida.url })
    .eq("id", pagoId);

  if (error) {
    return { error: `No se pudo guardar el comprobante: ${error.message}` };
  }

  revalidatePath(`/cobranza/pagos/${pagoId}/recibo`);
  return undefined;
}
