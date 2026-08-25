import "server-only";
import { createClient } from "@/lib/supabase/server";

export type MatriculaResultado = {
  matricula_id: string;
  alumno_id: string;
  alumno_nombre: string;
  alumno_apellido: string;
  aula_nombre: string;
  representante_nombre: string;
  representante_cedula: string | null;
};

export async function buscarMatriculas(
  q: string,
  anioEscolarId: string,
): Promise<MatriculaResultado[]> {
  if (!q.trim()) return [];
  const supabase = await createClient();

  // La relación real es matriculas -> alumnos -> alumno_contactos (no hay FK
  // directa matrícula-contacto), así que alumno_contactos va anidado DENTRO
  // del embed de "alumno", no como hermano de "matriculas".
  const { data, error } = await supabase
    .from("matriculas")
    .select(
      `id,
       alumno:alumnos!inner(
         id, nombre, apellido,
         alumno_contactos!inner(es_responsable_pago, persona:personas!inner(nombre, apellido, cedula))
       ),
       aula:aulas!inner(nombre)`,
    )
    .eq("anio_escolar_id", anioEscolarId)
    .eq("alumno.alumno_contactos.es_responsable_pago", true)
    .or(
      `nombre.ilike.%${q}%,apellido.ilike.%${q}%`,
      { referencedTable: "alumno" },
    )
    .limit(20);

  if (error || !data) return [];

  return data.map((m) => {
    // Supabase puede tipar las relaciones como objeto o arreglo según el join;
    // se normaliza a un único registro en ambos casos.
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
      alumno_nombre: alumno?.nombre ?? "",
      alumno_apellido: alumno?.apellido ?? "",
      aula_nombre: aula?.nombre ?? "",
      representante_nombre: persona ? `${persona.nombre} ${persona.apellido}` : "",
      representante_cedula: persona?.cedula ?? null,
    };
  });
}

export type CuotaPlan = {
  id: string;
  tipo: "matricula" | "mensualidad" | "mensualidad_agosto";
  parte_numero: number | null;
  mes_referencia: string | null;
  descripcion: string;
  monto_usd: number;
  monto_usd_pagado: number;
  fecha_vencimiento: string;
  estado: "pendiente" | "parcial" | "pagado";
};

export type MatriculaDetalle = {
  matricula_id: string;
  alumno_nombre: string;
  alumno_apellido: string;
  aula_nombre: string;
  anio_escolar_nombre: string;
  representante_nombre: string;
  representante_telefono: string | null;
  cuotas: CuotaPlan[];
};

export async function getMatriculaDetalle(
  matriculaId: string,
): Promise<MatriculaDetalle | null> {
  const supabase = await createClient();

  const { data: matricula, error } = await supabase
    .from("matriculas")
    .select(
      `id,
       alumno:alumnos!inner(
         nombre, apellido,
         alumno_contactos!inner(es_responsable_pago, persona:personas!inner(nombre, apellido, telefono))
       ),
       aula:aulas!inner(nombre),
       anio_escolar:anios_escolares!inner(nombre)`,
    )
    .eq("id", matriculaId)
    .eq("alumno.alumno_contactos.es_responsable_pago", true)
    .single();

  if (error || !matricula) return null;

  const alumno = Array.isArray(matricula.alumno) ? matricula.alumno[0] : matricula.alumno;
  const aula = Array.isArray(matricula.aula) ? matricula.aula[0] : matricula.aula;
  const anioEscolar = Array.isArray(matricula.anio_escolar)
    ? matricula.anio_escolar[0]
    : matricula.anio_escolar;
  const contactoRaw = alumno?.alumno_contactos;
  const contacto = Array.isArray(contactoRaw) ? contactoRaw[0] : contactoRaw;
  const persona = contacto
    ? Array.isArray(contacto.persona)
      ? contacto.persona[0]
      : contacto.persona
    : null;

  const { data: cuotas } = await supabase
    .from("plan_pago_items")
    .select(
      "id, tipo, parte_numero, mes_referencia, descripcion, monto_usd, monto_usd_pagado, fecha_vencimiento, estado",
    )
    .eq("matricula_id", matriculaId)
    .order("fecha_vencimiento", { ascending: true });

  return {
    matricula_id: matricula.id,
    alumno_nombre: alumno?.nombre ?? "",
    alumno_apellido: alumno?.apellido ?? "",
    aula_nombre: aula?.nombre ?? "",
    anio_escolar_nombre: anioEscolar?.nombre ?? "",
    representante_nombre: persona ? `${persona.nombre} ${persona.apellido}` : "",
    representante_telefono: persona?.telefono ?? null,
    cuotas: (cuotas ?? []).map((c) => ({
      ...c,
      monto_usd: Number(c.monto_usd),
      monto_usd_pagado: Number(c.monto_usd_pagado),
    })),
  };
}
