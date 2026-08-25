"use server";

import { redirect } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { findOrCreatePersona } from "@/lib/personas";

export type ActionState = { error?: string } | undefined;

type Autorizado = {
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string;
  parentesco: string;
};

export async function crearAlumno(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const alumnoNombre = String(formData.get("alumno_nombre") ?? "").trim();
  const alumnoApellido = String(formData.get("alumno_apellido") ?? "").trim();
  const fechaNacimiento = String(formData.get("fecha_nacimiento") ?? "");
  const datosMedicos = String(formData.get("datos_medicos") ?? "").trim();
  const alergias = String(formData.get("alergias") ?? "").trim();
  const aulaId = String(formData.get("aula_id") ?? "");
  const anioEscolarId = String(formData.get("anio_escolar_id") ?? "");
  const estado = String(formData.get("estado") ?? "inscrito");

  const repNombre = String(formData.get("representante_nombre") ?? "").trim();
  const repApellido = String(formData.get("representante_apellido") ?? "").trim();
  const repCedula = String(formData.get("representante_cedula") ?? "").trim();
  const repTelefono = String(formData.get("representante_telefono") ?? "").trim();
  const repEmail = String(formData.get("representante_email") ?? "").trim();

  const padreNombre = String(formData.get("padre_nombre") ?? "").trim();
  const padreApellido = String(formData.get("padre_apellido") ?? "").trim();
  const padreCedula = String(formData.get("padre_cedula") ?? "").trim();
  const padreTelefono = String(formData.get("padre_telefono") ?? "").trim();

  const madreNombre = String(formData.get("madre_nombre") ?? "").trim();
  const madreApellido = String(formData.get("madre_apellido") ?? "").trim();
  const madreCedula = String(formData.get("madre_cedula") ?? "").trim();
  const madreTelefono = String(formData.get("madre_telefono") ?? "").trim();

  const montoPactado = formData.get("monto_pactado");
  const motivoDescuento = String(formData.get("motivo_descuento") ?? "hermano").trim();

  let autorizados: Autorizado[] = [];
  try {
    autorizados = JSON.parse(String(formData.get("autorizados_json") ?? "[]"));
  } catch {
    return { error: "No se pudo leer la lista de autorizados a retirar." };
  }

  if (
    !alumnoNombre || !alumnoApellido || !fechaNacimiento || !aulaId || !anioEscolarId ||
    !repNombre || !repApellido || !repCedula
  ) {
    return { error: "Completa los datos del alumno y del representante de pago." };
  }
  if (estado !== "preinscrito" && estado !== "inscrito") {
    return { error: "Estado inicial inválido." };
  }

  const { data: alumno, error: errorAlumno } = await supabase
    .from("alumnos")
    .insert({
      nombre: alumnoNombre,
      apellido: alumnoApellido,
      fecha_nacimiento: fechaNacimiento,
      datos_medicos: datosMedicos || null,
      alergias: alergias || null,
    })
    .select("id")
    .single();

  if (errorAlumno || !alumno) {
    return { error: `No se pudo crear el alumno: ${errorAlumno?.message}` };
  }

  const repResultado = await findOrCreatePersona(supabase, {
    cedula: repCedula,
    nombre: repNombre,
    apellido: repApellido,
    telefono: repTelefono,
    email: repEmail,
  });
  if ("error" in repResultado) {
    return { error: `Representante de pago: ${repResultado.error}` };
  }

  const contactosPendientes: { persona_id: string; rol: string; es_responsable_pago: boolean }[] = [
    { persona_id: repResultado.id, rol: "representante_pago", es_responsable_pago: true },
  ];

  if (padreNombre && padreApellido && padreCedula) {
    const r = await findOrCreatePersona(supabase, {
      cedula: padreCedula,
      nombre: padreNombre,
      apellido: padreApellido,
      telefono: padreTelefono,
    });
    if ("error" in r) return { error: `Padre: ${r.error}` };
    contactosPendientes.push({ persona_id: r.id, rol: "padre", es_responsable_pago: false });
  }

  if (madreNombre && madreApellido && madreCedula) {
    const r = await findOrCreatePersona(supabase, {
      cedula: madreCedula,
      nombre: madreNombre,
      apellido: madreApellido,
      telefono: madreTelefono,
    });
    if ("error" in r) return { error: `Madre: ${r.error}` };
    contactosPendientes.push({ persona_id: r.id, rol: "madre", es_responsable_pago: false });
  }

  const { error: errorContactos } = await supabase
    .from("alumno_contactos")
    .insert(contactosPendientes.map((c) => ({ ...c, alumno_id: alumno.id })));

  if (errorContactos) {
    return { error: `No se pudieron guardar los contactos: ${errorContactos.message}` };
  }

  for (const a of autorizados) {
    if (!a.nombre || !a.apellido || !a.cedula) continue;
    const r = await findOrCreatePersona(supabase, {
      cedula: a.cedula,
      nombre: a.nombre,
      apellido: a.apellido,
      telefono: a.telefono,
    });
    if ("error" in r) return { error: `Autorizado a retirar (${a.nombre}): ${r.error}` };

    const { error: errorAutorizado } = await supabase.from("alumno_autorizados_retiro").insert({
      alumno_id: alumno.id,
      persona_id: r.id,
      parentesco: a.parentesco || null,
    });
    if (errorAutorizado) {
      return { error: `No se pudo guardar el autorizado ${a.nombre}: ${errorAutorizado.message}` };
    }
  }

  const { data: matricula, error: errorMatricula } = await supabase
    .from("matriculas")
    .insert({
      alumno_id: alumno.id,
      anio_escolar_id: anioEscolarId,
      aula_id: aulaId,
      estado,
    })
    .select("id")
    .single();

  if (errorMatricula || !matricula) {
    return { error: `No se pudo crear la matrícula: ${errorMatricula?.message}` };
  }

  if (montoPactado && Number(montoPactado) > 0) {
    const { data: anio } = await supabase
      .from("anios_escolares")
      .select("fecha_inicio")
      .eq("id", anioEscolarId)
      .single();

    await supabase.from("alumno_precios_pactados").insert({
      matricula_id: matricula.id,
      monto_mensual_usd: Number(montoPactado),
      motivo: motivoDescuento || "hermano",
      autorizado_por: perfil.id,
      vigente_desde_mes: anio?.fecha_inicio ?? new Date().toISOString().slice(0, 10),
    });
  }

  if (estado === "inscrito") {
    const { error: errorPlan } = await supabase.rpc("generar_plan_pago", {
      p_matricula_id: matricula.id,
    });
    if (errorPlan) {
      return {
        error: `El alumno se creó, pero falló la generación del plan de pagos: ${errorPlan.message}`,
      };
    }
  }

  redirect(`/alumnos/${alumno.id}`);
}
