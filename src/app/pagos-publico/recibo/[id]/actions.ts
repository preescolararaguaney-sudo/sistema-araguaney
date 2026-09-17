"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { subirComprobante } from "@/lib/comprobantes";

export type ActionState = { error?: string } | undefined;

export async function actualizarComprobantePublico(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = createAdminClient();

  const pagoId = String(formData.get("pago_id") ?? "");
  const foto = formData.get("comprobante_foto");
  if (!pagoId || !(foto instanceof File) || foto.size === 0) {
    return { error: "Selecciona una imagen o PDF del comprobante." };
  }

  const subida = await subirComprobante(foto);
  if ("error" in subida) return subida;

  const { error } = await admin
    .from("pagos")
    .update({ comprobante_url: subida.url })
    .eq("id", pagoId);

  if (error) {
    return { error: `No se pudo guardar el comprobante: ${error.message}` };
  }

  revalidatePath(`/pagos-publico/recibo/${pagoId}`);
  return undefined;
}
