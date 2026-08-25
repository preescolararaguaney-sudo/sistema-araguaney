"use server";

import { revalidatePath } from "next/cache";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hoyCaracas } from "@/lib/format";

export type ActionState = { error?: string; ok?: boolean } | undefined;

export async function cambiarEstadoTrabajador(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const trabajadorId = String(formData.get("trabajador_id") ?? "");
  const nuevoEstado = String(formData.get("nuevo_estado") ?? "");

  if (!trabajadorId || !nuevoEstado) return { error: "Faltan datos." };

  const { error } = await supabase
    .from("trabajadores")
    .update({ estado: nuevoEstado })
    .eq("id", trabajadorId);

  if (error) return { error: `No se pudo actualizar el estado: ${error.message}` };

  revalidatePath(`/personal/${trabajadorId}`);
  return undefined;
}

export async function agregarNovedad(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const trabajadorId = String(formData.get("trabajador_id") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const fechaInicio = String(formData.get("fecha_inicio") ?? "");
  const fechaFin = String(formData.get("fecha_fin") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!trabajadorId || !tipo || !fechaInicio || !fechaFin) {
    return { error: "Completa tipo, fecha de inicio y fecha de fin." };
  }
  if (fechaFin < fechaInicio) {
    return { error: "La fecha de fin no puede ser anterior a la de inicio." };
  }

  const { error } = await supabase.from("trabajador_novedades").insert({
    trabajador_id: trabajadorId,
    tipo,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    motivo: motivo || null,
    creado_por: perfil.id,
  });

  if (error) return { error: `No se pudo registrar la novedad: ${error.message}` };

  // Si la novedad cubre el día de hoy, refleja el estado actual del trabajador.
  const hoy = hoyCaracas();
  if (fechaInicio <= hoy && hoy <= fechaFin) {
    await supabase.from("trabajadores").update({ estado: tipo }).eq("id", trabajadorId);
  }

  revalidatePath(`/personal/${trabajadorId}`);
  return undefined;
}

export async function asignarAula(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const trabajadorId = String(formData.get("trabajador_id") ?? "");
  const aulaId = String(formData.get("aula_id") ?? "");
  const rolEnAula = String(formData.get("rol_en_aula") ?? "titular");

  if (!trabajadorId || !aulaId) return { error: "Selecciona un aula." };

  const { error } = await supabase.from("trabajador_aulas").insert({
    trabajador_id: trabajadorId,
    aula_id: aulaId,
    rol_en_aula: rolEnAula,
    vigente_desde: hoyCaracas(),
  });

  if (error) return { error: `No se pudo asignar el aula: ${error.message}` };

  revalidatePath(`/personal/${trabajadorId}`);
  return undefined;
}

export async function finalizarAsignacionAula(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const trabajadorAulaId = String(formData.get("trabajador_aula_id") ?? "");
  const trabajadorId = String(formData.get("trabajador_id") ?? "");

  const { error } = await supabase
    .from("trabajador_aulas")
    .update({ vigente_hasta: hoyCaracas() })
    .eq("id", trabajadorAulaId);

  if (error) return { error: `No se pudo finalizar la asignación: ${error.message}` };

  revalidatePath(`/personal/${trabajadorId}`);
  return undefined;
}

export async function crearAccesoTrabajador(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Solo la directora gestiona usuarios (regla de negocio explícita).
  await requireRol(["directora"]);
  const supabase = await createClient();

  const trabajadorId = String(formData.get("trabajador_id") ?? "");
  const nombreCompleto = String(formData.get("nombre_completo") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const rol = String(formData.get("rol") ?? "");

  if (!trabajadorId || !nombreCompleto || !email || !password || !rol) {
    return { error: "Completa todos los campos." };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (!["directora", "administracion"].includes(rol)) {
    return { error: "Rol inválido." };
  }

  const admin = createAdminClient();
  const { data: usuario, error: errorUsuario } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (errorUsuario || !usuario.user) {
    return { error: `No se pudo crear el usuario: ${errorUsuario?.message}` };
  }

  const { error: errorPerfil } = await supabase.from("perfiles").insert({
    id: usuario.user.id,
    nombre_completo: nombreCompleto,
    rol,
    trabajador_id: trabajadorId,
  });

  if (errorPerfil) {
    return { error: `El usuario se creó pero no se pudo vincular el perfil: ${errorPerfil.message}` };
  }

  revalidatePath(`/personal/${trabajadorId}`);
  return { ok: true };
}
