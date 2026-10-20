import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type AlumnoEmergencia = {
  apellido: string;
  nombre: string;
  certificado: number | null;
};

/**
 * Lista para la página pública /emergencia (sin login): solo apellido,
 * nombre y N.º de certificado del seguro de los alumnos inscritos. A
 * propósito NO devuelve el id del alumno — ese id es el que arma los links
 * personalizados de /inscripcion?alumno=<id>, y no debe quedar expuesto a
 * quien abra esta página. Tampoco aula, fecha de nacimiento ni contactos.
 */
export async function getAlumnosEmergenciaPublico(): Promise<AlumnoEmergencia[]> {
  const admin = createAdminClient();

  const { data: anio } = await admin
    .from("anios_escolares")
    .select("id")
    .eq("activo", true)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!anio) return [];

  const { data } = await admin
    .from("matriculas")
    .select("alumno:alumnos!inner(nombre, apellido, certificado_seguro)")
    .eq("anio_escolar_id", anio.id)
    .eq("estado", "inscrito");

  return (data ?? [])
    .map((m) => {
      const a = Array.isArray(m.alumno) ? m.alumno[0] : m.alumno;
      return {
        apellido: (a?.apellido ?? "").trim(),
        nombre: (a?.nombre ?? "").trim(),
        certificado: a?.certificado_seguro ?? null,
      };
    })
    .sort(
      (x, y) =>
        x.apellido.localeCompare(y.apellido, "es") || x.nombre.localeCompare(y.nombre, "es"),
    );
}
