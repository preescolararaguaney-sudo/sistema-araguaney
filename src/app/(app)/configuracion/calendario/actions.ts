"use server";

import { revalidatePath } from "next/cache";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; ok?: boolean } | undefined;

export async function crearAnioEscolar(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const fechaInicio = String(formData.get("fecha_inicio") ?? "");
  const fechaFin = String(formData.get("fecha_fin") ?? "");
  const precioMatricula = Number(formData.get("precio_matricula"));
  const precioMensualidad = Number(formData.get("precio_mensualidad"));
  const lapsos = [1, 2, 3].map((n) => ({
    numero: n,
    fecha_inicio: String(formData.get(`lapso_${n}_inicio`) ?? ""),
    fecha_cierre: String(formData.get(`lapso_${n}_cierre`) ?? ""),
  }));

  if (!nombre || !fechaInicio || !fechaFin) {
    return { error: "Completa nombre, fecha de inicio y fecha de fin del año escolar." };
  }
  if (lapsos.some((l) => !l.fecha_inicio || !l.fecha_cierre)) {
    return { error: "Completa las fechas de inicio y cierre de los 3 lapsos." };
  }
  if (!precioMatricula || !precioMensualidad) {
    return { error: "Indica el monto de matrícula y de mensualidad en USD." };
  }

  const { data: anio, error: errorAnio } = await supabase
    .from("anios_escolares")
    .insert({ nombre, fecha_inicio: fechaInicio, fecha_fin: fechaFin })
    .select("id")
    .single();

  if (errorAnio || !anio) {
    return { error: `No se pudo crear el año escolar: ${errorAnio?.message ?? "error desconocido"}` };
  }

  const { error: errorLapsos } = await supabase.from("lapsos").insert(
    lapsos.map((l) => ({
      anio_escolar_id: anio.id,
      numero: l.numero,
      fecha_inicio: l.fecha_inicio,
      fecha_cierre: l.fecha_cierre,
    })),
  );

  if (errorLapsos) {
    return { error: `No se pudieron crear los lapsos: ${errorLapsos.message}` };
  }

  const { error: errorPrecios } = await supabase.from("precios").insert([
    {
      anio_escolar_id: anio.id,
      concepto: "matricula",
      monto_usd: precioMatricula,
      vigente_desde: fechaInicio,
    },
    {
      anio_escolar_id: anio.id,
      concepto: "mensualidad",
      monto_usd: precioMensualidad,
      vigente_desde: fechaInicio,
    },
  ]);

  if (errorPrecios) {
    return { error: `No se pudieron crear los precios: ${errorPrecios.message}` };
  }

  revalidatePath("/configuracion/calendario");
  return { ok: true };
}

export async function actualizarLapso(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const fechaInicio = String(formData.get("fecha_inicio") ?? "");
  const fechaCierre = String(formData.get("fecha_cierre") ?? "");

  if (!id || !fechaInicio || !fechaCierre) {
    return { error: "Faltan datos del lapso." };
  }

  const { error } = await supabase
    .from("lapsos")
    .update({ fecha_inicio: fechaInicio, fecha_cierre: fechaCierre })
    .eq("id", id);

  if (error) {
    return { error: `No se pudo actualizar el lapso: ${error.message}` };
  }

  revalidatePath("/configuracion/calendario");
  return { ok: true };
}
