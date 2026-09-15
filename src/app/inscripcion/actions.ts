"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string } | undefined;

type Autorizado = {
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string;
  parentesco: string;
};

function texto(formData: FormData, campo: string): string | null {
  const v = String(formData.get(campo) ?? "").trim();
  return v || null;
}

export async function crearSolicitud(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const alumnoNombre = texto(formData, "alumno_nombre");
  const alumnoApellido = texto(formData, "alumno_apellido");
  const representanteEs = String(formData.get("representante_es") ?? "madre");
  const representanteNombre = texto(formData, "representante_nombre");
  const representanteApellido = texto(formData, "representante_apellido");
  const representanteCedula = texto(formData, "representante_cedula");

  if (!alumnoNombre || !alumnoApellido) {
    return { error: "Completa el nombre y apellido del alumno." };
  }
  if (!representanteNombre || !representanteApellido || !representanteCedula) {
    return { error: "Completa nombre, apellido y cédula del representante que autoriza." };
  }

  let autorizados: Autorizado[] = [];
  try {
    autorizados = JSON.parse(String(formData.get("autorizados_json") ?? "[]"));
  } catch {
    return { error: "No se pudo leer la lista de personas autorizadas a retirar." };
  }

  const { error } = await supabase.from("solicitudes_inscripcion").insert({
    anio_escolar_id: texto(formData, "anio_escolar_id"),

    alumno_nombre: alumnoNombre,
    alumno_apellido: alumnoApellido,
    alumno_fecha_nacimiento: texto(formData, "alumno_fecha_nacimiento"),
    alumno_lugar_nacimiento: texto(formData, "alumno_lugar_nacimiento"),
    alumno_direccion: texto(formData, "alumno_direccion"),
    alumno_tipo_vivienda: texto(formData, "alumno_tipo_vivienda"),
    alumno_condicion_vivienda: texto(formData, "alumno_condicion_vivienda"),
    alumno_estado_vivienda: texto(formData, "alumno_estado_vivienda"),
    telefono_contacto_rapido: texto(formData, "telefono_contacto_rapido"),

    madre_nombre: texto(formData, "madre_nombre"),
    madre_apellido: texto(formData, "madre_apellido"),
    madre_fecha_nacimiento: texto(formData, "madre_fecha_nacimiento"),
    madre_lugar_nacimiento: texto(formData, "madre_lugar_nacimiento"),
    madre_cedula: texto(formData, "madre_cedula"),
    madre_estado_civil: texto(formData, "madre_estado_civil"),
    madre_religion: texto(formData, "madre_religion"),
    madre_empresa: texto(formData, "madre_empresa"),
    madre_direccion_trabajo: texto(formData, "madre_direccion_trabajo"),
    madre_jefe_inmediato: texto(formData, "madre_jefe_inmediato"),
    madre_departamento: texto(formData, "madre_departamento"),
    madre_antiguedad: texto(formData, "madre_antiguedad"),
    madre_sueldo: texto(formData, "madre_sueldo"),
    madre_horario: texto(formData, "madre_horario"),
    madre_grado_instruccion: texto(formData, "madre_grado_instruccion"),
    madre_telefono_celular: texto(formData, "madre_telefono_celular"),
    madre_telefono_hab: texto(formData, "madre_telefono_hab"),
    madre_telefono_otro: texto(formData, "madre_telefono_otro"),
    madre_contacto_emergencia: texto(formData, "madre_contacto_emergencia"),
    madre_vive_con_nino: formData.has("madre_vive_con_nino")
      ? formData.get("madre_vive_con_nino") === "si"
      : null,
    madre_horario_con_nino: texto(formData, "madre_horario_con_nino"),
    madre_motivo_institucion: texto(formData, "madre_motivo_institucion"),

    padre_nombre: texto(formData, "padre_nombre"),
    padre_apellido: texto(formData, "padre_apellido"),
    padre_fecha_nacimiento: texto(formData, "padre_fecha_nacimiento"),
    padre_lugar_nacimiento: texto(formData, "padre_lugar_nacimiento"),
    padre_cedula: texto(formData, "padre_cedula"),
    padre_estado_civil: texto(formData, "padre_estado_civil"),
    padre_religion: texto(formData, "padre_religion"),
    padre_empresa: texto(formData, "padre_empresa"),
    padre_direccion_trabajo: texto(formData, "padre_direccion_trabajo"),
    padre_jefe_inmediato: texto(formData, "padre_jefe_inmediato"),
    padre_departamento: texto(formData, "padre_departamento"),
    padre_antiguedad: texto(formData, "padre_antiguedad"),
    padre_sueldo: texto(formData, "padre_sueldo"),
    padre_horario: texto(formData, "padre_horario"),
    padre_grado_instruccion: texto(formData, "padre_grado_instruccion"),
    padre_telefono_celular: texto(formData, "padre_telefono_celular"),
    padre_telefono_hab: texto(formData, "padre_telefono_hab"),
    padre_telefono_otro: texto(formData, "padre_telefono_otro"),
    padre_contacto_emergencia: texto(formData, "padre_contacto_emergencia"),
    padre_vive_con_nino: formData.has("padre_vive_con_nino")
      ? formData.get("padre_vive_con_nino") === "si"
      : null,
    padre_horario_con_nino: texto(formData, "padre_horario_con_nino"),
    padre_motivo_institucion: texto(formData, "padre_motivo_institucion"),

    representante_es: representanteEs,
    representante_nombre: representanteNombre,
    representante_apellido: representanteApellido,
    representante_cedula: representanteCedula,
    representante_telefono: texto(formData, "representante_telefono"),
    representante_email: texto(formData, "representante_email"),
    representante_direccion: texto(formData, "representante_direccion"),

    datos_medicos: texto(formData, "datos_medicos"),
    alergias: texto(formData, "alergias"),
    medicamento_autorizado: texto(formData, "medicamento_autorizado"),
    dosis_medicamento_autorizado: texto(formData, "dosis_medicamento_autorizado"),
    autorizados_retiro_json: autorizados.filter((a) => a.nombre && a.apellido && a.cedula),
  });

  if (error) {
    return { error: `No se pudo enviar la solicitud: ${error.message}` };
  }

  redirect("/inscripcion/gracias");
}
