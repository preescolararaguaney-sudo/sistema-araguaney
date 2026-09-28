"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string } | undefined;

function texto(formData: FormData, campo: string): string | null {
  const v = String(formData.get(campo) ?? "").trim();
  return v || null;
}

export async function crearSolicitudPersonal(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const nombre = texto(formData, "nombre");
  const apellido = texto(formData, "apellido");
  const cedula = texto(formData, "cedula");

  if (!nombre || !apellido || !cedula) {
    return { error: "Completa nombre, apellido y cédula." };
  }

  const { error } = await supabase.from("solicitudes_personal").insert({
    nombre,
    apellido,
    cedula,
    pais_nacimiento: texto(formData, "pais_nacimiento"),
    fecha_nacimiento: texto(formData, "fecha_nacimiento"),
    email: texto(formData, "email"),
    telefono: texto(formData, "telefono"),
    domicilio_estado: texto(formData, "domicilio_estado"),
    domicilio_municipio: texto(formData, "domicilio_municipio"),
    domicilio_parroquia: texto(formData, "domicilio_parroquia"),
    direccion: texto(formData, "direccion"),
    titulo_obtenido: texto(formData, "titulo_obtenido"),
    institucion_titulo: texto(formData, "institucion_titulo"),
    fecha_obtencion_titulo: texto(formData, "fecha_obtencion_titulo"),
    fecha_ingreso: texto(formData, "fecha_ingreso"),
  });

  if (error) {
    return { error: `No se pudo enviar la solicitud: ${error.message}` };
  }

  redirect("/personal-inscripcion/gracias");
}
