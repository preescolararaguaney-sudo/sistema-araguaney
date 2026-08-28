"use server";

import { redirect } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { findOrCreatePersona } from "@/lib/personas";

export type ActionState = { error?: string } | undefined;

type NuevoAutorizado = {
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string;
  parentesco: string;
};

async function guardarContacto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  alumnoId: string,
  rol: "representante_pago" | "padre" | "madre",
  prefix: string,
  formData: FormData,
): Promise<string | null> {
  const nombre = String(formData.get(`${prefix}_nombre`) ?? "").trim();
  const apellido = String(formData.get(`${prefix}_apellido`) ?? "").trim();
  const cedula = String(formData.get(`${prefix}_cedula`) ?? "").trim();
  const telefono = String(formData.get(`${prefix}_telefono`) ?? "").trim();
  const email = String(formData.get(`${prefix}_email`) ?? "").trim();
  const contactoIdExistente = String(formData.get(`${prefix}_contacto_id`) ?? "");
  const personaIdExistente = String(formData.get(`${prefix}_persona_id`) ?? "");

  if (!nombre || !apellido || !cedula) return null; // sin datos suficientes, no se toca

  if (contactoIdExistente && personaIdExistente) {
    // Ya existe: se edita la persona en su sitio (no se reasigna vía cédula,
    // para no romper el vínculo si la cédula tenía una errata).
    const { error } = await supabase
      .from("personas")
      .update({ nombre, apellido, cedula, telefono: telefono || null, email: email || null })
      .eq("id", personaIdExistente);
    return error ? `No se pudo actualizar (${rol}): ${error.message}` : null;
  }

  const resultado = await findOrCreatePersona(supabase, { cedula, nombre, apellido, telefono, email });
  if ("error" in resultado) return `${rol}: ${resultado.error}`;

  const { error } = await supabase.from("alumno_contactos").insert({
    alumno_id: alumnoId,
    persona_id: resultado.id,
    rol,
    es_responsable_pago: rol === "representante_pago",
  });
  return error ? `No se pudo agregar (${rol}): ${error.message}` : null;
}

export async function actualizarAlumno(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const alumnoId = String(formData.get("alumno_id") ?? "");
  const nombre = String(formData.get("alumno_nombre") ?? "").trim();
  const apellido = String(formData.get("alumno_apellido") ?? "").trim();
  const fechaNacimiento = String(formData.get("fecha_nacimiento") ?? "").trim();
  const datosMedicos = String(formData.get("datos_medicos") ?? "").trim();
  const alergias = String(formData.get("alergias") ?? "").trim();
  const aulaId = String(formData.get("aula_id") ?? "");
  const matriculaId = String(formData.get("matricula_id") ?? "");

  if (!alumnoId || !nombre || !apellido) {
    return { error: "Completa nombre y apellido del alumno." };
  }

  const { error: errorAlumno } = await supabase
    .from("alumnos")
    .update({
      nombre,
      apellido,
      fecha_nacimiento: fechaNacimiento || null,
      datos_medicos: datosMedicos || null,
      alergias: alergias || null,
    })
    .eq("id", alumnoId);

  if (errorAlumno) {
    return { error: `No se pudo actualizar el alumno: ${errorAlumno.message}` };
  }

  if (matriculaId && aulaId) {
    const { error: errorMatricula } = await supabase
      .from("matriculas")
      .update({ aula_id: aulaId })
      .eq("id", matriculaId);
    if (errorMatricula) {
      return { error: `No se pudo actualizar el aula: ${errorMatricula.message}` };
    }
  }

  for (const [rol, prefix] of [
    ["representante_pago", "representante"],
    ["padre", "padre"],
    ["madre", "madre"],
  ] as const) {
    const err = await guardarContacto(supabase, alumnoId, rol, prefix, formData);
    if (err) return { error: err };
  }

  let nuevosAutorizados: NuevoAutorizado[] = [];
  try {
    nuevosAutorizados = JSON.parse(String(formData.get("nuevos_autorizados_json") ?? "[]"));
  } catch {
    return { error: "No se pudo leer la lista de nuevos autorizados." };
  }

  for (const a of nuevosAutorizados) {
    if (!a.nombre || !a.apellido || !a.cedula) continue;
    const resultado = await findOrCreatePersona(supabase, {
      cedula: a.cedula,
      nombre: a.nombre,
      apellido: a.apellido,
      telefono: a.telefono,
    });
    if ("error" in resultado) return { error: `Autorizado (${a.nombre}): ${resultado.error}` };

    const { error } = await supabase.from("alumno_autorizados_retiro").insert({
      alumno_id: alumnoId,
      persona_id: resultado.id,
      parentesco: a.parentesco || null,
    });
    if (error) return { error: `No se pudo agregar el autorizado ${a.nombre}: ${error.message}` };
  }

  redirect(`/alumnos/${alumnoId}`);
}
