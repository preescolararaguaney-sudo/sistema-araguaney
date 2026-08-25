"use server";

import { redirect } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string } | undefined;

export async function crearMatriculaBasica(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const alumnoNombre = String(formData.get("alumno_nombre") ?? "").trim();
  const alumnoApellido = String(formData.get("alumno_apellido") ?? "").trim();
  const fechaNacimiento = String(formData.get("fecha_nacimiento") ?? "");
  const aulaId = String(formData.get("aula_id") ?? "");
  const anioEscolarId = String(formData.get("anio_escolar_id") ?? "");
  const repNombre = String(formData.get("representante_nombre") ?? "").trim();
  const repApellido = String(formData.get("representante_apellido") ?? "").trim();
  const repCedula = String(formData.get("representante_cedula") ?? "").trim();
  const repTelefono = String(formData.get("representante_telefono") ?? "").trim();
  const montoPactado = formData.get("monto_pactado");

  if (
    !alumnoNombre || !alumnoApellido || !fechaNacimiento || !aulaId || !anioEscolarId ||
    !repNombre || !repApellido || !repCedula
  ) {
    return { error: "Completa los datos del alumno y del representante de pago." };
  }

  const { data: alumno, error: errorAlumno } = await supabase
    .from("alumnos")
    .insert({ nombre: alumnoNombre, apellido: alumnoApellido, fecha_nacimiento: fechaNacimiento })
    .select("id")
    .single();

  if (errorAlumno || !alumno) {
    return { error: `No se pudo crear el alumno: ${errorAlumno?.message}` };
  }

  const { data: persona, error: errorPersona } = await supabase
    .from("personas")
    .insert({
      nombre: repNombre,
      apellido: repApellido,
      cedula: repCedula,
      telefono: repTelefono || null,
    })
    .select("id")
    .single();

  if (errorPersona || !persona) {
    return { error: `No se pudo crear el representante: ${errorPersona?.message}` };
  }

  const { error: errorContacto } = await supabase.from("alumno_contactos").insert({
    alumno_id: alumno.id,
    persona_id: persona.id,
    rol: "representante_pago",
    es_responsable_pago: true,
  });

  if (errorContacto) {
    return { error: `No se pudo vincular al representante: ${errorContacto.message}` };
  }

  const { data: matricula, error: errorMatricula } = await supabase
    .from("matriculas")
    .insert({
      alumno_id: alumno.id,
      anio_escolar_id: anioEscolarId,
      aula_id: aulaId,
      estado: "inscrito",
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
      motivo: String(formData.get("motivo_descuento") ?? "hermano"),
      vigente_desde_mes: anio?.fecha_inicio ?? new Date().toISOString().slice(0, 10),
    });
  }

  const { error: errorPlan } = await supabase.rpc("generar_plan_pago", {
    p_matricula_id: matricula.id,
  });

  if (errorPlan) {
    return { error: `Matrícula creada, pero falló la generación del plan de pagos: ${errorPlan.message}` };
  }

  redirect(`/cobranza/estado-cuenta?matricula=${matricula.id}`);
}
