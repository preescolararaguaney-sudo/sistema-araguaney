"use server";

import { redirect } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { findOrCreatePersona } from "@/lib/personas";
import type { SolicitudDetalle } from "@/lib/queries/solicitudes";

export type ActionState = { error?: string } | undefined;

export async function aprobarSolicitud(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const id = String(formData.get("solicitud_id") ?? "");
  const aulaId = String(formData.get("aula_id") ?? "");
  const anioEscolarId = String(formData.get("anio_escolar_id") ?? "");
  const estadoInicial = String(formData.get("estado") ?? "preinscrito");
  if (!aulaId || !anioEscolarId) {
    return { error: "Selecciona el año escolar y el aula." };
  }

  const { data: solData, error: errSol } = await supabase
    .from("solicitudes_inscripcion")
    .select("*")
    .eq("id", id)
    .eq("estado", "pendiente")
    .maybeSingle();

  const sol = solData as SolicitudDetalle | null;
  if (errSol || !sol) {
    return { error: "La solicitud no existe o ya fue revisada." };
  }

  const { data: alumno, error: errAlumno } = await supabase
    .from("alumnos")
    .insert({
      nombre: sol.alumno_nombre,
      apellido: sol.alumno_apellido,
      fecha_nacimiento: sol.alumno_fecha_nacimiento,
      lugar_nacimiento: sol.alumno_lugar_nacimiento,
      direccion: sol.alumno_direccion,
      tipo_vivienda: sol.alumno_tipo_vivienda,
      condicion_vivienda: sol.alumno_condicion_vivienda,
      estado_vivienda: sol.alumno_estado_vivienda,
      telefono_contacto_rapido: sol.telefono_contacto_rapido,
      datos_medicos: sol.datos_medicos,
      alergias: sol.alergias,
      medicamento_autorizado: sol.medicamento_autorizado,
      dosis_medicamento_autorizado: sol.dosis_medicamento_autorizado,
    })
    .select("id")
    .single();

  if (errAlumno || !alumno) {
    return { error: `No se pudo crear el alumno: ${errAlumno?.message}` };
  }

  type ContactoPendiente = {
    persona_id: string;
    rol: string;
    es_responsable_pago: boolean;
    contacto_emergencia: string | null;
    vive_con_nino: boolean | null;
    horario_con_nino: string | null;
    motivo_seleccion_institucion: string | null;
  };
  const contactosPendientes: ContactoPendiente[] = [];

  if (sol.madre_nombre && sol.madre_apellido && sol.madre_cedula) {
    const r = await findOrCreatePersona(supabase, {
      cedula: sol.madre_cedula as string,
      nombre: sol.madre_nombre as string,
      apellido: sol.madre_apellido as string,
      telefono: sol.madre_telefono_celular as string | null,
      lugar_nacimiento: sol.madre_lugar_nacimiento as string | null,
      fecha_nacimiento: sol.madre_fecha_nacimiento as string | null,
      estado_civil: sol.madre_estado_civil as string | null,
      religion: sol.madre_religion as string | null,
      grado_instruccion: sol.madre_grado_instruccion as string | null,
      empresa_donde_labora: sol.madre_empresa as string | null,
      direccion_trabajo: sol.madre_direccion_trabajo as string | null,
      jefe_inmediato: sol.madre_jefe_inmediato as string | null,
      departamento_laboral: sol.madre_departamento as string | null,
      antiguedad_laboral: sol.madre_antiguedad as string | null,
      sueldo: sol.madre_sueldo as string | null,
      horario_trabajo: sol.madre_horario as string | null,
      telefono_habitacion: sol.madre_telefono_hab as string | null,
      telefono_otro: sol.madre_telefono_otro as string | null,
    });
    if ("error" in r) return { error: `Madre: ${r.error}` };
    contactosPendientes.push({
      persona_id: r.id,
      rol: "madre",
      es_responsable_pago: false,
      contacto_emergencia: sol.madre_contacto_emergencia as string | null,
      vive_con_nino: sol.madre_vive_con_nino as boolean | null,
      horario_con_nino: sol.madre_horario_con_nino as string | null,
      motivo_seleccion_institucion: sol.madre_motivo_institucion as string | null,
    });
  }

  if (sol.padre_nombre && sol.padre_apellido && sol.padre_cedula) {
    const r = await findOrCreatePersona(supabase, {
      cedula: sol.padre_cedula as string,
      nombre: sol.padre_nombre as string,
      apellido: sol.padre_apellido as string,
      telefono: sol.padre_telefono_celular as string | null,
      lugar_nacimiento: sol.padre_lugar_nacimiento as string | null,
      fecha_nacimiento: sol.padre_fecha_nacimiento as string | null,
      estado_civil: sol.padre_estado_civil as string | null,
      religion: sol.padre_religion as string | null,
      grado_instruccion: sol.padre_grado_instruccion as string | null,
      empresa_donde_labora: sol.padre_empresa as string | null,
      direccion_trabajo: sol.padre_direccion_trabajo as string | null,
      jefe_inmediato: sol.padre_jefe_inmediato as string | null,
      departamento_laboral: sol.padre_departamento as string | null,
      antiguedad_laboral: sol.padre_antiguedad as string | null,
      sueldo: sol.padre_sueldo as string | null,
      horario_trabajo: sol.padre_horario as string | null,
      telefono_habitacion: sol.padre_telefono_hab as string | null,
      telefono_otro: sol.padre_telefono_otro as string | null,
    });
    if ("error" in r) return { error: `Padre: ${r.error}` };
    contactosPendientes.push({
      persona_id: r.id,
      rol: "padre",
      es_responsable_pago: false,
      contacto_emergencia: sol.padre_contacto_emergencia as string | null,
      vive_con_nino: sol.padre_vive_con_nino as boolean | null,
      horario_con_nino: sol.padre_horario_con_nino as string | null,
      motivo_seleccion_institucion: sol.padre_motivo_institucion as string | null,
    });
  }

  const repResultado = await findOrCreatePersona(supabase, {
    cedula: sol.representante_cedula as string,
    nombre: sol.representante_nombre as string,
    apellido: sol.representante_apellido as string,
    telefono: sol.representante_telefono as string | null,
    email: sol.representante_email as string | null,
  });
  if ("error" in repResultado) return { error: `Representante: ${repResultado.error}` };
  contactosPendientes.push({
    persona_id: repResultado.id,
    rol: "representante_pago",
    es_responsable_pago: true,
    contacto_emergencia: null,
    vive_con_nino: null,
    horario_con_nino: null,
    motivo_seleccion_institucion: null,
  });

  const { error: errContactos } = await supabase
    .from("alumno_contactos")
    .insert(contactosPendientes.map((c) => ({ ...c, alumno_id: alumno.id })));
  if (errContactos) {
    return { error: `No se pudieron guardar los contactos: ${errContactos.message}` };
  }

  const autorizados = sol.autorizados_retiro_json ?? [];
  for (const a of autorizados) {
    if (!a.nombre || !a.apellido || !a.cedula) continue;
    const r = await findOrCreatePersona(supabase, {
      cedula: a.cedula,
      nombre: a.nombre,
      apellido: a.apellido,
      telefono: a.telefono,
    });
    if ("error" in r) return { error: `Autorizado a retirar (${a.nombre}): ${r.error}` };

    const { error: errAutorizado } = await supabase.from("alumno_autorizados_retiro").insert({
      alumno_id: alumno.id,
      persona_id: r.id,
      parentesco: a.parentesco || null,
    });
    if (errAutorizado) {
      return { error: `No se pudo guardar el autorizado ${a.nombre}: ${errAutorizado.message}` };
    }
  }

  const { data: matricula, error: errMatricula } = await supabase
    .from("matriculas")
    .insert({
      alumno_id: alumno.id,
      anio_escolar_id: anioEscolarId,
      aula_id: aulaId,
      estado: estadoInicial,
    })
    .select("id")
    .single();

  if (errMatricula || !matricula) {
    return { error: `No se pudo crear la matrícula: ${errMatricula?.message}` };
  }

  if (estadoInicial === "inscrito") {
    const { error: errPlan } = await supabase.rpc("generar_plan_pago", {
      p_matricula_id: matricula.id,
    });
    if (errPlan) {
      return {
        error: `El alumno se creó, pero falló la generación del plan de pagos: ${errPlan.message}`,
      };
    }
  }

  const { error: errSolUpdate } = await supabase
    .from("solicitudes_inscripcion")
    .update({
      estado: "aprobada",
      revisado_por: perfil.id,
      revisado_en: new Date().toISOString(),
      alumno_creado_id: alumno.id,
    })
    .eq("id", id);
  if (errSolUpdate) {
    return { error: `El alumno se creó, pero no se pudo marcar la solicitud como aprobada: ${errSolUpdate.message}` };
  }

  redirect(`/alumnos/${alumno.id}`);
}

export async function rechazarSolicitud(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const id = String(formData.get("solicitud_id") ?? "");
  const motivo = String(formData.get("motivo_rechazo") ?? "").trim();
  if (!motivo) return { error: "Escribe el motivo del rechazo." };

  const { error } = await supabase
    .from("solicitudes_inscripcion")
    .update({
      estado: "rechazada",
      revisado_por: perfil.id,
      revisado_en: new Date().toISOString(),
      motivo_rechazo: motivo,
    })
    .eq("id", id)
    .eq("estado", "pendiente");

  if (error) return { error: `No se pudo rechazar: ${error.message}` };

  redirect("/solicitudes");
}
