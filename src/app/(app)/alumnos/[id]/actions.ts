"use server";

import { revalidatePath } from "next/cache";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hoyCaracas } from "@/lib/format";

export type ActionState = { error?: string } | undefined;

export async function cambiarEstadoMatricula(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const matriculaId = String(formData.get("matricula_id") ?? "");
  const alumnoId = String(formData.get("alumno_id") ?? "");
  const nuevoEstado = String(formData.get("nuevo_estado") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!matriculaId || !nuevoEstado) {
    return { error: "Faltan datos." };
  }
  if (nuevoEstado === "retirado" && !motivo) {
    return { error: "Indica el motivo del retiro." };
  }

  const cambios: Record<string, unknown> = { estado: nuevoEstado };
  if (nuevoEstado === "retirado") {
    cambios.fecha_retiro = hoyCaracas();
    cambios.motivo_retiro = motivo;
  }

  const { error } = await supabase.from("matriculas").update(cambios).eq("id", matriculaId);

  if (error) {
    return { error: `No se pudo actualizar el estado: ${error.message}` };
  }

  // Si pasa a "inscrito" y todavía no tiene plan de pagos (ej. venía de
  // preinscrito), se genera ahora.
  if (nuevoEstado === "inscrito") {
    const { count } = await supabase
      .from("plan_pago_items")
      .select("id", { count: "exact", head: true })
      .eq("matricula_id", matriculaId);

    if (!count) {
      const { error: errorPlan } = await supabase.rpc("generar_plan_pago", {
        p_matricula_id: matriculaId,
      });
      if (errorPlan) {
        return { error: `El estado cambió, pero falló generar el plan de pagos: ${errorPlan.message}` };
      }
    }
  }

  revalidatePath(`/alumnos/${alumnoId}`);
  return undefined;
}
