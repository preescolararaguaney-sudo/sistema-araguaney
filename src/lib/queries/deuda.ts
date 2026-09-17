import "server-only";
import { createClient } from "@/lib/supabase/server";

export type DeudaAlumno = {
  matricula_id: string;
  alumno_nombre: string;
  alumno_apellido: string;
  aula_nombre: string;
  representante_nombre: string;
  representante_telefono: string | null;
  deuda_actual_usd: number;
};

/**
 * Deuda pendiente total (no solo vencida) de cada alumno inscrito, a la
 * fecha en que se consulta. A diferencia de getMorosos, no exige que el
 * alumno ya tenga un representante_pago cargado (varios de la nómina
 * recién importada aún no lo tienen) — ver el mismo bug de alumno_contactos
 * !inner documentado en las queries de cobranza.
 */
export async function getDeudaActual(anioEscolarId: string): Promise<DeudaAlumno[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("plan_pago_items")
    .select(
      `monto_usd, monto_usd_pagado,
       matricula:matriculas!inner(
         id, anio_escolar_id, estado,
         alumno:alumnos!inner(
           nombre, apellido,
           alumno_contactos(es_responsable_pago, persona:personas!inner(nombre, apellido, telefono))
         ),
         aula:aulas!inner(nombre)
       )`,
    )
    .neq("estado", "pagado")
    .eq("matricula.anio_escolar_id", anioEscolarId)
    .eq("matricula.estado", "inscrito");

  if (error || !data) return [];

  const porMatricula = new Map<string, DeudaAlumno>();

  for (const row of data) {
    const matricula = Array.isArray(row.matricula) ? row.matricula[0] : row.matricula;
    const alumno = Array.isArray(matricula.alumno) ? matricula.alumno[0] : matricula.alumno;
    const aula = Array.isArray(matricula.aula) ? matricula.aula[0] : matricula.aula;

    const contactosRaw = alumno?.alumno_contactos;
    const contactos = Array.isArray(contactosRaw) ? contactosRaw : contactosRaw ? [contactosRaw] : [];
    const contactoResp = contactos.find((c) => c.es_responsable_pago);
    const persona = contactoResp
      ? Array.isArray(contactoResp.persona)
        ? contactoResp.persona[0]
        : contactoResp.persona
      : null;

    const saldo = Number(row.monto_usd) - Number(row.monto_usd_pagado);
    if (saldo <= 0.001) continue;

    const existente = porMatricula.get(matricula.id);
    if (existente) {
      existente.deuda_actual_usd += saldo;
    } else {
      porMatricula.set(matricula.id, {
        matricula_id: matricula.id,
        alumno_nombre: alumno?.nombre ?? "",
        alumno_apellido: alumno?.apellido ?? "",
        aula_nombre: aula?.nombre ?? "",
        representante_nombre: persona ? `${persona.nombre} ${persona.apellido}` : "— (sin cargar)",
        representante_telefono: persona?.telefono ?? null,
        deuda_actual_usd: saldo,
      });
    }
  }

  return Array.from(porMatricula.values()).sort(
    (a, b) =>
      a.aula_nombre.localeCompare(b.aula_nombre) ||
      a.alumno_apellido.localeCompare(b.alumno_apellido),
  );
}
