import "server-only";
import { createClient } from "@/lib/supabase/server";

export type DeudaPorMes = {
  aula_nombre: string;
  alumno_nombre: string;
  alumno_apellido: string;
  concepto: string;
  fecha_vencimiento: string;
  monto_usd: number;
};

/**
 * Desglose de deuda por concepto/mes, de cada alumno inscrito, incluyendo
 * solo lo que ya venció a la fecha de la solicitud (matrícula + meses
 * transcurridos) — no meses futuros todavía no exigibles.
 */
export async function getDeudaPorMes(anioEscolarId: string, hoy: string): Promise<DeudaPorMes[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("plan_pago_items")
    .select(
      `descripcion, monto_usd, monto_usd_pagado, fecha_vencimiento,
       matricula:matriculas!inner(
         anio_escolar_id, estado,
         alumno:alumnos!inner(nombre, apellido),
         aula:aulas!inner(nombre)
       )`,
    )
    .neq("estado", "pagado")
    .lte("fecha_vencimiento", hoy)
    .eq("matricula.anio_escolar_id", anioEscolarId)
    .eq("matricula.estado", "inscrito")
    .order("fecha_vencimiento", { ascending: true });

  if (error || !data) return [];

  const filas: DeudaPorMes[] = [];

  for (const row of data) {
    const saldo = Number(row.monto_usd) - Number(row.monto_usd_pagado);
    if (saldo <= 0.001) continue;

    const matricula = Array.isArray(row.matricula) ? row.matricula[0] : row.matricula;
    const alumno = Array.isArray(matricula.alumno) ? matricula.alumno[0] : matricula.alumno;
    const aula = Array.isArray(matricula.aula) ? matricula.aula[0] : matricula.aula;

    filas.push({
      aula_nombre: aula?.nombre ?? "",
      alumno_nombre: alumno?.nombre ?? "",
      alumno_apellido: alumno?.apellido ?? "",
      concepto: row.descripcion,
      fecha_vencimiento: row.fecha_vencimiento,
      monto_usd: saldo,
    });
  }

  return filas.sort(
    (a, b) =>
      a.aula_nombre.localeCompare(b.aula_nombre) ||
      a.alumno_apellido.localeCompare(b.alumno_apellido) ||
      a.fecha_vencimiento.localeCompare(b.fecha_vencimiento),
  );
}
