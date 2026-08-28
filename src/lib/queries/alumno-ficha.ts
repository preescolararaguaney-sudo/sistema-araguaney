import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Contacto = {
  rol: string;
  nombre: string;
  apellido: string;
  cedula: string | null;
  telefono: string | null;
  email: string | null;
};

export type Autorizado = {
  nombre: string;
  apellido: string;
  cedula: string | null;
  telefono: string | null;
  parentesco: string | null;
};

export type AlumnoFicha = {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  datos_medicos: string | null;
  alergias: string | null;
  matricula: {
    id: string;
    estado: string;
    aula_id: string;
    aula_nombre: string;
    anio_escolar_nombre: string;
    fecha_retiro: string | null;
    motivo_retiro: string | null;
  } | null;
  contactos: Contacto[];
  autorizados: Autorizado[];
};

export async function getAlumnoFicha(alumnoId: string): Promise<AlumnoFicha | null> {
  const supabase = await createClient();

  const { data: alumno, error } = await supabase
    .from("alumnos")
    .select("id, nombre, apellido, fecha_nacimiento, datos_medicos, alergias")
    .eq("id", alumnoId)
    .single();

  if (error || !alumno) return null;

  const { data: matricula } = await supabase
    .from("matriculas")
    .select(
      `id, estado, aula_id, fecha_retiro, motivo_retiro,
       aula:aulas!inner(nombre),
       anio_escolar:anios_escolares!inner(nombre, activo)`,
    )
    .eq("alumno_id", alumnoId)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: contactosRaw } = await supabase
    .from("alumno_contactos")
    .select("rol, persona:personas!inner(nombre, apellido, cedula, telefono, email)")
    .eq("alumno_id", alumnoId);

  const { data: autorizadosRaw } = await supabase
    .from("alumno_autorizados_retiro")
    .select("parentesco, persona:personas!inner(nombre, apellido, cedula, telefono)")
    .eq("alumno_id", alumnoId);

  const aula = matricula ? (Array.isArray(matricula.aula) ? matricula.aula[0] : matricula.aula) : null;
  const anioEscolar = matricula
    ? Array.isArray(matricula.anio_escolar)
      ? matricula.anio_escolar[0]
      : matricula.anio_escolar
    : null;

  return {
    id: alumno.id,
    nombre: alumno.nombre,
    apellido: alumno.apellido,
    fecha_nacimiento: alumno.fecha_nacimiento,
    datos_medicos: alumno.datos_medicos,
    alergias: alumno.alergias,
    matricula: matricula
      ? {
          id: matricula.id,
          estado: matricula.estado,
          aula_id: matricula.aula_id,
          aula_nombre: aula?.nombre ?? "",
          anio_escolar_nombre: anioEscolar?.nombre ?? "",
          fecha_retiro: matricula.fecha_retiro,
          motivo_retiro: matricula.motivo_retiro,
        }
      : null,
    contactos: (contactosRaw ?? []).map((c) => {
      const p = Array.isArray(c.persona) ? c.persona[0] : c.persona;
      return {
        rol: c.rol,
        nombre: p?.nombre ?? "",
        apellido: p?.apellido ?? "",
        cedula: p?.cedula ?? null,
        telefono: p?.telefono ?? null,
        email: p?.email ?? null,
      };
    }),
    autorizados: (autorizadosRaw ?? []).map((a) => {
      const p = Array.isArray(a.persona) ? a.persona[0] : a.persona;
      return {
        nombre: p?.nombre ?? "",
        apellido: p?.apellido ?? "",
        cedula: p?.cedula ?? null,
        telefono: p?.telefono ?? null,
        parentesco: a.parentesco,
      };
    }),
  };
}
