import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hoyCaracas } from "@/lib/format";

export type Moroso = {
  matricula_id: string;
  alumno_nombre: string;
  alumno_apellido: string;
  aula_nombre: string;
  representante_nombre: string;
  representante_telefono: string | null;
  cuotas_vencidas: number;
  total_vencido_usd: number;
};

export async function getMorosos(anioEscolarId: string): Promise<Moroso[]> {
  const supabase = await createClient();
  const hoy = hoyCaracas();

  const { data, error } = await supabase
    .from("plan_pago_items")
    .select(
      `monto_usd, monto_usd_pagado, fecha_vencimiento,
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
    .lt("fecha_vencimiento", hoy)
    .eq("matricula.anio_escolar_id", anioEscolarId)
    .eq("matricula.estado", "inscrito")
    .eq("matricula.alumno.alumno_contactos.es_responsable_pago", true);

  if (error || !data) return [];

  const porMatricula = new Map<string, Moroso>();

  for (const row of data) {
    const matricula = Array.isArray(row.matricula) ? row.matricula[0] : row.matricula;
    const alumno = Array.isArray(matricula.alumno) ? matricula.alumno[0] : matricula.alumno;
    const aula = Array.isArray(matricula.aula) ? matricula.aula[0] : matricula.aula;
    const contactoRaw = alumno?.alumno_contactos;
    const contacto = Array.isArray(contactoRaw) ? contactoRaw[0] : contactoRaw;
    const persona = contacto
      ? Array.isArray(contacto.persona)
        ? contacto.persona[0]
        : contacto.persona
      : null;

    const saldo = Number(row.monto_usd) - Number(row.monto_usd_pagado);
    const existente = porMatricula.get(matricula.id);

    if (existente) {
      existente.cuotas_vencidas += 1;
      existente.total_vencido_usd += saldo;
    } else {
      porMatricula.set(matricula.id, {
        matricula_id: matricula.id,
        alumno_nombre: alumno?.nombre ?? "",
        alumno_apellido: alumno?.apellido ?? "",
        aula_nombre: aula?.nombre ?? "",
        representante_nombre: persona ? `${persona.nombre} ${persona.apellido}` : "",
        representante_telefono: persona?.telefono ?? null,
        cuotas_vencidas: 1,
        total_vencido_usd: saldo,
      });
    }
  }

  return Array.from(porMatricula.values()).sort(
    (a, b) => b.total_vencido_usd - a.total_vencido_usd,
  );
}
