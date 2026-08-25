import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AlumnoFila = {
  matricula_id: string;
  alumno_id: string;
  nombre: string;
  apellido: string;
  aula_nombre: string;
  estado: string;
  representante_nombre: string;
};

export async function getAlumnos(
  anioEscolarId: string,
  filtros: { aulaId?: string; estado?: string; q?: string } = {},
): Promise<AlumnoFila[]> {
  const supabase = await createClient();

  let query = supabase
    .from("matriculas")
    .select(
      `id, estado, aula_id,
       alumno:alumnos!inner(
         id, nombre, apellido,
         alumno_contactos!inner(es_responsable_pago, persona:personas!inner(nombre, apellido))
       ),
       aula:aulas!inner(nombre)`,
    )
    .eq("anio_escolar_id", anioEscolarId)
    .eq("alumno.alumno_contactos.es_responsable_pago", true);

  if (filtros.aulaId) query = query.eq("aula_id", filtros.aulaId);
  if (filtros.estado) query = query.eq("estado", filtros.estado);
  if (filtros.q) {
    query = query.or(`nombre.ilike.%${filtros.q}%,apellido.ilike.%${filtros.q}%`, {
      referencedTable: "alumno",
    });
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // PostgREST no ordena filas de la tabla principal por una columna de una
  // relación embebida (solo ordena dentro de cada embed), así que se ordena
  // en JS; el volumen (decenas de alumnos) hace esto trivial en costo.
  const filas = data.map((m) => {
    const alumno = Array.isArray(m.alumno) ? m.alumno[0] : m.alumno;
    const aula = Array.isArray(m.aula) ? m.aula[0] : m.aula;
    const contactoRaw = alumno?.alumno_contactos;
    const contacto = Array.isArray(contactoRaw) ? contactoRaw[0] : contactoRaw;
    const persona = contacto
      ? Array.isArray(contacto.persona)
        ? contacto.persona[0]
        : contacto.persona
      : null;

    return {
      matricula_id: m.id,
      alumno_id: alumno?.id ?? "",
      nombre: alumno?.nombre ?? "",
      apellido: alumno?.apellido ?? "",
      aula_nombre: aula?.nombre ?? "",
      estado: m.estado,
      representante_nombre: persona ? `${persona.nombre} ${persona.apellido}` : "",
    };
  });

  return filas.sort((a, b) => a.apellido.localeCompare(b.apellido) || a.nombre.localeCompare(b.nombre));
}

export type CupoAula = {
  aula_id: string;
  aula_nombre: string;
  capacidad: number;
  inscritos: number;
};

export async function getCuposPorAula(anioEscolarId: string): Promise<CupoAula[]> {
  const supabase = await createClient();

  const { data: aulas } = await supabase
    .from("aulas")
    .select("id, nombre, capacidad")
    .eq("activa", true)
    .order("nombre");

  const { data: matriculas } = await supabase
    .from("matriculas")
    .select("aula_id")
    .eq("anio_escolar_id", anioEscolarId)
    .eq("estado", "inscrito");

  const conteos = new Map<string, number>();
  for (const m of matriculas ?? []) {
    conteos.set(m.aula_id, (conteos.get(m.aula_id) ?? 0) + 1);
  }

  return (aulas ?? []).map((a) => ({
    aula_id: a.id,
    aula_nombre: a.nombre,
    capacidad: a.capacidad,
    inscritos: conteos.get(a.id) ?? 0,
  }));
}
