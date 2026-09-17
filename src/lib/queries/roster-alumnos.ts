import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AlumnoRoster = {
  aula_nombre: string;
  apellido: string;
  nombre: string;
  fecha_nacimiento: string | null;
};

/**
 * Nómina de alumnos inscritos por aula, con la misma forma que el archivo
 * de nómina original usado para la carga inicial (aula / apellido / nombre
 * / fecha de nacimiento) — útil para que la directora la reutilice como
 * respaldo o la comparta con el personal.
 */
export async function getRosterAlumnos(anioEscolarId: string): Promise<AlumnoRoster[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("matriculas")
    .select(
      `estado,
       aula:aulas!inner(nombre),
       alumno:alumnos!inner(nombre, apellido, fecha_nacimiento)`,
    )
    .eq("anio_escolar_id", anioEscolarId)
    .eq("estado", "inscrito");

  if (error || !data) return [];

  return data
    .map((m) => {
      const aula = Array.isArray(m.aula) ? m.aula[0] : m.aula;
      const alumno = Array.isArray(m.alumno) ? m.alumno[0] : m.alumno;
      return {
        aula_nombre: aula?.nombre ?? "",
        apellido: alumno?.apellido ?? "",
        nombre: alumno?.nombre ?? "",
        fecha_nacimiento: alumno?.fecha_nacimiento ?? null,
      };
    })
    .sort(
      (a, b) => a.aula_nombre.localeCompare(b.aula_nombre) || a.apellido.localeCompare(b.apellido),
    );
}
