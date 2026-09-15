"use server";

import { redirect } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { findOrCreatePersona } from "@/lib/personas";
import type { SolicitudDetalle } from "@/lib/queries/solicitudes";

export type ActionState = { error?: string } | undefined;

// Convierte null -> undefined para los campos "extendidos" de personas
// (laborales/personales) leídos de la solicitud. Es clave para no perder
// datos: si esta solicitud no preguntó ese campo (ej. el formulario
// reducido ya no pide estado civil o sueldo), pasar `undefined` le dice a
// findOrCreatePersona "no toques este campo" en vez de borrar con null un
// dato que la misma persona ya tenía de una solicitud anterior más completa.
function siTieneDato(v: unknown): string | undefined {
  return v === null || v === undefined ? undefined : (v as string);
}

export async function aprobarSolicitud(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const id = String(formData.get("solicitud_id") ?? "");

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

  let alumnoId: string;

  if (sol.alumno_existente_id) {
    // Completa/corrige datos de un alumno ya inscrito (ej. importado en
    // bloque desde la nómina): solo se actualizan los campos que esta
    // solicitud realmente trae, para no borrar con null algo que ya
    // estaba bien cargado.
    alumnoId = sol.alumno_existente_id as string;
    const actualizacion: Record<string, unknown> = {};
    if (sol.alumno_nombre) actualizacion.nombre = sol.alumno_nombre;
    if (sol.alumno_apellido) actualizacion.apellido = sol.alumno_apellido;
    if (sol.alumno_fecha_nacimiento) actualizacion.fecha_nacimiento = sol.alumno_fecha_nacimiento;
    if (sol.alumno_lugar_nacimiento) actualizacion.lugar_nacimiento = sol.alumno_lugar_nacimiento;
    if (sol.alumno_direccion) actualizacion.direccion = sol.alumno_direccion;
    if (sol.alumno_tipo_vivienda) actualizacion.tipo_vivienda = sol.alumno_tipo_vivienda;
    if (sol.alumno_condicion_vivienda) actualizacion.condicion_vivienda = sol.alumno_condicion_vivienda;
    if (sol.alumno_estado_vivienda) actualizacion.estado_vivienda = sol.alumno_estado_vivienda;
    if (sol.telefono_contacto_rapido) actualizacion.telefono_contacto_rapido = sol.telefono_contacto_rapido;
    if (sol.datos_medicos) actualizacion.datos_medicos = sol.datos_medicos;
    if (sol.alergias) actualizacion.alergias = sol.alergias;
    if (sol.medicamento_autorizado) actualizacion.medicamento_autorizado = sol.medicamento_autorizado;
    if (sol.dosis_medicamento_autorizado) {
      actualizacion.dosis_medicamento_autorizado = sol.dosis_medicamento_autorizado;
    }

    if (Object.keys(actualizacion).length > 0) {
      const { error: errUpdate } = await supabase
        .from("alumnos")
        .update(actualizacion)
        .eq("id", alumnoId);
      if (errUpdate) return { error: `No se pudo actualizar el alumno: ${errUpdate.message}` };
    }
  } else {
    const aulaId = String(formData.get("aula_id") ?? "");
    const anioEscolarId = String(formData.get("anio_escolar_id") ?? "");
    const estadoInicial = String(formData.get("estado") ?? "preinscrito");
    if (!aulaId || !anioEscolarId) {
      return { error: "Selecciona el año escolar y el aula." };
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
    alumnoId = alumno.id;

    const { data: matricula, error: errMatricula } = await supabase
      .from("matriculas")
      .insert({
        alumno_id: alumnoId,
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
      lugar_nacimiento: siTieneDato(sol.madre_lugar_nacimiento),
      fecha_nacimiento: siTieneDato(sol.madre_fecha_nacimiento),
      estado_civil: siTieneDato(sol.madre_estado_civil),
      religion: siTieneDato(sol.madre_religion),
      grado_instruccion: siTieneDato(sol.madre_grado_instruccion),
      empresa_donde_labora: siTieneDato(sol.madre_empresa),
      direccion_trabajo: siTieneDato(sol.madre_direccion_trabajo),
      jefe_inmediato: siTieneDato(sol.madre_jefe_inmediato),
      departamento_laboral: siTieneDato(sol.madre_departamento),
      antiguedad_laboral: siTieneDato(sol.madre_antiguedad),
      sueldo: siTieneDato(sol.madre_sueldo),
      horario_trabajo: siTieneDato(sol.madre_horario),
      telefono_habitacion: siTieneDato(sol.madre_telefono_hab),
      telefono_otro: siTieneDato(sol.madre_telefono_otro),
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
      lugar_nacimiento: siTieneDato(sol.padre_lugar_nacimiento),
      fecha_nacimiento: siTieneDato(sol.padre_fecha_nacimiento),
      estado_civil: siTieneDato(sol.padre_estado_civil),
      religion: siTieneDato(sol.padre_religion),
      grado_instruccion: siTieneDato(sol.padre_grado_instruccion),
      empresa_donde_labora: siTieneDato(sol.padre_empresa),
      direccion_trabajo: siTieneDato(sol.padre_direccion_trabajo),
      jefe_inmediato: siTieneDato(sol.padre_jefe_inmediato),
      departamento_laboral: siTieneDato(sol.padre_departamento),
      antiguedad_laboral: siTieneDato(sol.padre_antiguedad),
      sueldo: siTieneDato(sol.padre_sueldo),
      horario_trabajo: siTieneDato(sol.padre_horario),
      telefono_habitacion: siTieneDato(sol.padre_telefono_hab),
      telefono_otro: siTieneDato(sol.padre_telefono_otro),
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

  // El formulario público ya no pregunta quién es el representante de
  // pago (se quitó esa sección); solo se crea este contacto si la
  // solicitud SÍ trae esos datos (ej. una solicitud vieja, de antes del
  // cambio). Si no vienen, el alumno queda sin responsable de pago
  // asignado — la directora lo asigna después desde /alumnos/[id]/editar.
  if (sol.representante_nombre && sol.representante_apellido && sol.representante_cedula) {
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
  }

  // upsert (no insert): si esta solicitud está completando un alumno ya
  // inscrito y el mismo representante/padre/madre ya había sido cargado
  // antes (misma cédula, mismo rol), se actualiza en vez de fallar por la
  // restricción unique(alumno_id, persona_id, rol).
  if (contactosPendientes.length > 0) {
    const { error: errContactos } = await supabase
      .from("alumno_contactos")
      .upsert(
        contactosPendientes.map((c) => ({ ...c, alumno_id: alumnoId })),
        { onConflict: "alumno_id,persona_id,rol" },
      );
    if (errContactos) {
      return { error: `No se pudieron guardar los contactos: ${errContactos.message}` };
    }
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

    const { error: errAutorizado } = await supabase.from("alumno_autorizados_retiro").upsert(
      {
        alumno_id: alumnoId,
        persona_id: r.id,
        parentesco: a.parentesco || null,
      },
      { onConflict: "alumno_id,persona_id" },
    );
    if (errAutorizado) {
      return { error: `No se pudo guardar el autorizado ${a.nombre}: ${errAutorizado.message}` };
    }
  }

  const { error: errSolUpdate } = await supabase
    .from("solicitudes_inscripcion")
    .update({
      estado: "aprobada",
      revisado_por: perfil.id,
      revisado_en: new Date().toISOString(),
      alumno_creado_id: alumnoId,
    })
    .eq("id", id);
  if (errSolUpdate) {
    return {
      error: `Los datos se guardaron, pero no se pudo marcar la solicitud como aprobada: ${errSolUpdate.message}`,
    };
  }

  redirect(`/alumnos/${alumnoId}`);
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
