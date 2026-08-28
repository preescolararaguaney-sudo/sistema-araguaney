import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ContactoEditable = {
  contacto_id: string;
  persona_id: string;
  nombre: string;
  apellido: string;
  cedula: string | null;
  telefono: string | null;
  email: string | null;
};

export type AutorizadoExistente = {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string | null;
  telefono: string | null;
  parentesco: string | null;
};

export type AlumnoEditable = {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  datos_medicos: string | null;
  alergias: string | null;
  matricula: { id: string; aula_id: string; estado: string } | null;
  representante: ContactoEditable | null;
  padre: ContactoEditable | null;
  madre: ContactoEditable | null;
  autorizados: AutorizadoExistente[];
};

export async function getAlumnoEditable(alumnoId: string): Promise<AlumnoEditable | null> {
  const supabase = await createClient();

  const { data: alumno, error } = await supabase
    .from("alumnos")
    .select("id, nombre, apellido, fecha_nacimiento, datos_medicos, alergias")
    .eq("id", alumnoId)
    .single();

  if (error || !alumno) return null;

  const { data: matricula } = await supabase
    .from("matriculas")
    .select("id, aula_id, estado")
    .eq("alumno_id", alumnoId)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: contactos } = await supabase
    .from("alumno_contactos")
    .select("id, rol, persona:personas!inner(id, nombre, apellido, cedula, telefono, email)")
    .eq("alumno_id", alumnoId);

  function contactoDe(rol: string): ContactoEditable | null {
    const fila = contactos?.find((c) => c.rol === rol);
    if (!fila) return null;
    const persona = Array.isArray(fila.persona) ? fila.persona[0] : fila.persona;
    if (!persona) return null;
    return {
      contacto_id: fila.id,
      persona_id: persona.id,
      nombre: persona.nombre,
      apellido: persona.apellido,
      cedula: persona.cedula,
      telefono: persona.telefono,
      email: persona.email,
    };
  }

  const { data: autorizadosRaw } = await supabase
    .from("alumno_autorizados_retiro")
    .select("id, parentesco, persona:personas!inner(nombre, apellido, cedula, telefono)")
    .eq("alumno_id", alumnoId);

  return {
    id: alumno.id,
    nombre: alumno.nombre,
    apellido: alumno.apellido,
    fecha_nacimiento: alumno.fecha_nacimiento,
    datos_medicos: alumno.datos_medicos,
    alergias: alumno.alergias,
    matricula: matricula ?? null,
    representante: contactoDe("representante_pago"),
    padre: contactoDe("padre"),
    madre: contactoDe("madre"),
    autorizados: (autorizadosRaw ?? []).map((a) => {
      const p = Array.isArray(a.persona) ? a.persona[0] : a.persona;
      return {
        id: a.id,
        nombre: p?.nombre ?? "",
        apellido: p?.apellido ?? "",
        cedula: p?.cedula ?? null,
        telefono: p?.telefono ?? null,
        parentesco: a.parentesco,
      };
    }),
  };
}
