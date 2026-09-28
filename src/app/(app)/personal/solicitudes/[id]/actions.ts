"use server";

import { redirect } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { SolicitudPersonalDetalle } from "@/lib/queries/personal-solicitudes";

export type ActionState = { error?: string } | undefined;

export async function aprobarSolicitudPersonal(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const id = String(formData.get("solicitud_id") ?? "");
  const cargoId = String(formData.get("cargo_id") ?? "");
  const fechaIngreso = String(formData.get("fecha_ingreso") ?? "");
  const tipoContrato = String(formData.get("tipo_contrato") ?? "indefinido");
  const salarioBase = Number(formData.get("salario_base_mensual"));
  const salarioFormalRaw = formData.get("salario_formal_mensual_bs");
  const salarioFormal = salarioFormalRaw ? Number(salarioFormalRaw) : null;
  const banco = String(formData.get("banco") ?? "").trim();
  const numeroCuenta = String(formData.get("numero_cuenta") ?? "").trim();

  if (!cargoId || !fechaIngreso) {
    return { error: "Selecciona el cargo y la fecha de ingreso." };
  }
  if (!salarioBase || salarioBase < 0) {
    return { error: "Indica el salario base mensual." };
  }

  const { data: solData, error: errSol } = await supabase
    .from("solicitudes_personal")
    .select("*")
    .eq("id", id)
    .eq("estado", "pendiente")
    .maybeSingle();

  const sol = solData as SolicitudPersonalDetalle | null;
  if (errSol || !sol) {
    return { error: "La solicitud no existe o ya fue revisada." };
  }

  const cedula = String(sol.cedula ?? "").trim();
  if (!cedula) {
    return { error: "Esta solicitud no trae cédula, no se puede crear el trabajador." };
  }

  const { data: yaExiste } = await supabase
    .from("trabajadores")
    .select("id")
    .eq("cedula", cedula)
    .maybeSingle();
  if (yaExiste) {
    return { error: `Ya existe un trabajador con la cédula ${cedula}.` };
  }

  const { data: trabajador, error: errTrabajador } = await supabase
    .from("trabajadores")
    .insert({
      nombre: sol.nombre,
      apellido: sol.apellido,
      cedula,
      telefono: sol.telefono ?? null,
      direccion: sol.direccion ?? null,
      pais_nacimiento: sol.pais_nacimiento ?? null,
      fecha_nacimiento: sol.fecha_nacimiento ?? null,
      email: sol.email ?? null,
      domicilio_estado: sol.domicilio_estado ?? null,
      domicilio_municipio: sol.domicilio_municipio ?? null,
      domicilio_parroquia: sol.domicilio_parroquia ?? null,
      titulo_obtenido: sol.titulo_obtenido ?? null,
      institucion_titulo: sol.institucion_titulo ?? null,
      fecha_obtencion_titulo: sol.fecha_obtencion_titulo ?? null,
      cargo_id: cargoId,
      fecha_ingreso: fechaIngreso,
      tipo_contrato: tipoContrato || "indefinido",
      salario_base_mensual: salarioBase,
      salario_formal_mensual_bs: salarioFormal,
      banco: banco || null,
      numero_cuenta: numeroCuenta || null,
    })
    .select("id")
    .single();

  if (errTrabajador || !trabajador) {
    return { error: `No se pudo crear el trabajador: ${errTrabajador?.message}` };
  }

  const { error: errSolUpdate } = await supabase
    .from("solicitudes_personal")
    .update({
      estado: "aprobada",
      revisado_por: perfil.id,
      revisado_en: new Date().toISOString(),
      trabajador_creado_id: trabajador.id,
    })
    .eq("id", id);
  if (errSolUpdate) {
    return {
      error: `El trabajador se creó, pero no se pudo marcar la solicitud como aprobada: ${errSolUpdate.message}`,
    };
  }

  redirect(`/personal/${trabajador.id}`);
}

export async function rechazarSolicitudPersonal(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const id = String(formData.get("solicitud_id") ?? "");
  const motivo = String(formData.get("motivo_rechazo") ?? "").trim();
  if (!motivo) return { error: "Escribe el motivo del rechazo." };

  const { error } = await supabase
    .from("solicitudes_personal")
    .update({
      estado: "rechazada",
      revisado_por: perfil.id,
      revisado_en: new Date().toISOString(),
      motivo_rechazo: motivo,
    })
    .eq("id", id)
    .eq("estado", "pendiente");

  if (error) return { error: `No se pudo rechazar: ${error.message}` };

  redirect("/personal/solicitudes");
}
