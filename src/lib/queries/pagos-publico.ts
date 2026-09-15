import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MatriculaDetalle, CuotaPlan } from "@/lib/queries/matriculas";

// Todas las funciones de este archivo usan el cliente service-role porque
// corren desde /pagos-publico (sin login): las tablas matriculas/alumnos/
// plan_pago_items/pagos no tienen política RLS pública. A diferencia de
// /inscripcion (que solo necesitaba INSERT en una tabla de solicitudes),
// este flujo necesita LEER cuotas y datos de alumno reales para armar el
// formulario de cobro — abrir eso a `anon` vía RLS sería un cambio de
// superficie mucho más grande que acotarlo aquí, función por función, a
// exactamente las columnas que la pantalla pública necesita mostrar.

export type AulaPublica = { id: string; nombre: string };

export async function getAulasPublico(): Promise<AulaPublica[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("aulas")
    .select("id, nombre")
    .eq("activa", true)
    .order("nombre");
  return data ?? [];
}

export type AlumnoPorAula = {
  matricula_id: string;
  alumno_id: string;
  nombre: string;
  apellido: string;
};

export async function getAlumnosPorAulaPublico(aulaId: string): Promise<AlumnoPorAula[]> {
  const admin = createAdminClient();

  const { data: anioEscolar } = await admin
    .from("anios_escolares")
    .select("id")
    .eq("activo", true)
    .maybeSingle();
  if (!anioEscolar) return [];

  const { data } = await admin
    .from("matriculas")
    .select("id, alumno_id, alumno:alumnos!inner(nombre, apellido)")
    .eq("aula_id", aulaId)
    .eq("anio_escolar_id", anioEscolar.id)
    .neq("estado", "retirado");

  return (data ?? [])
    .map((m) => {
      const alumno = Array.isArray(m.alumno) ? m.alumno[0] : m.alumno;
      return {
        matricula_id: m.id,
        alumno_id: m.alumno_id,
        nombre: alumno?.nombre ?? "",
        apellido: alumno?.apellido ?? "",
      };
    })
    .sort((a, b) => a.apellido.localeCompare(b.apellido) || a.nombre.localeCompare(b.nombre));
}

export async function getMatriculaDetallePublico(
  matriculaId: string,
): Promise<MatriculaDetalle | null> {
  const admin = createAdminClient();

  const { data: matricula, error } = await admin
    .from("matriculas")
    .select(
      `id,
       alumno:alumnos!inner(
         nombre, apellido,
         alumno_contactos(es_responsable_pago, persona:personas!inner(nombre, apellido, telefono))
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

  const { data: cuotas } = await admin
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
    representante_nombre: persona ? `${persona.nombre} ${persona.apellido}` : "— (sin cargar)",
    representante_telefono: persona?.telefono ?? null,
    cuotas: (cuotas ?? []) as CuotaPlan[],
  };
}

export type ReciboDetallePublico = {
  id: string;
  numero_recibo: number;
  fecha_pago: string;
  monto_usd_total: number;
  monto_bs_total: number;
  tasa_bcv_valor: number;
  metodo: string;
  referencia: string | null;
  anulado: boolean;
  motivo_anulacion: string | null;
  alumno_nombre: string;
  alumno_apellido: string;
  representante_nombre: string;
  registrado_por_nombre: string | null;
  aplicaciones: { descripcion: string; monto_usd_aplicado: number }[];
};

export async function getReciboDetallePublico(pagoId: string): Promise<ReciboDetallePublico | null> {
  const admin = createAdminClient();

  const { data: pago, error } = await admin
    .from("pagos")
    .select(
      `id, numero_recibo, fecha_pago, monto_usd_total, monto_bs_total, tasa_bcv_valor,
       metodo, referencia, anulado, motivo_anulacion, registrado_por_nombre,
       matricula:matriculas!inner(
         alumno:alumnos!inner(
           nombre, apellido,
           alumno_contactos(es_responsable_pago, persona:personas!inner(nombre, apellido))
         )
       )`,
    )
    .eq("id", pagoId)
    .eq("matricula.alumno.alumno_contactos.es_responsable_pago", true)
    .single();

  if (error || !pago) return null;

  const matricula = Array.isArray(pago.matricula) ? pago.matricula[0] : pago.matricula;
  const alumno = Array.isArray(matricula.alumno) ? matricula.alumno[0] : matricula.alumno;
  const contactoRaw = alumno?.alumno_contactos;
  const contacto = Array.isArray(contactoRaw) ? contactoRaw[0] : contactoRaw;
  const persona = contacto
    ? Array.isArray(contacto.persona)
      ? contacto.persona[0]
      : contacto.persona
    : null;

  const { data: aplicaciones } = await admin
    .from("pago_aplicaciones")
    .select("monto_usd_aplicado, plan_item:plan_pago_items!inner(descripcion)")
    .eq("pago_id", pagoId);

  return {
    id: pago.id,
    numero_recibo: pago.numero_recibo,
    fecha_pago: pago.fecha_pago,
    monto_usd_total: Number(pago.monto_usd_total),
    monto_bs_total: Number(pago.monto_bs_total),
    tasa_bcv_valor: Number(pago.tasa_bcv_valor),
    metodo: pago.metodo,
    referencia: pago.referencia,
    anulado: pago.anulado,
    motivo_anulacion: pago.motivo_anulacion,
    registrado_por_nombre: pago.registrado_por_nombre,
    alumno_nombre: alumno?.nombre ?? "",
    alumno_apellido: alumno?.apellido ?? "",
    representante_nombre: persona ? `${persona.nombre} ${persona.apellido}` : "— (sin cargar)",
    aplicaciones: (aplicaciones ?? []).map((a) => {
      const item = Array.isArray(a.plan_item) ? a.plan_item[0] : a.plan_item;
      return {
        descripcion: item?.descripcion ?? "",
        monto_usd_aplicado: Number(a.monto_usd_aplicado),
      };
    }),
  };
}
