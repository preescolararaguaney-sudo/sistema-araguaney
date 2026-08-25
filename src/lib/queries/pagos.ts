import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ReciboDetalle = {
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
  aplicaciones: { descripcion: string; monto_usd_aplicado: number }[];
};

export async function getReciboDetalle(pagoId: string): Promise<ReciboDetalle | null> {
  const supabase = await createClient();

  const { data: pago, error } = await supabase
    .from("pagos")
    .select(
      `id, numero_recibo, fecha_pago, monto_usd_total, monto_bs_total, tasa_bcv_valor,
       metodo, referencia, anulado, motivo_anulacion,
       matricula:matriculas!inner(
         alumno:alumnos!inner(
           nombre, apellido,
           alumno_contactos!inner(es_responsable_pago, persona:personas!inner(nombre, apellido))
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

  const { data: aplicaciones } = await supabase
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
    alumno_nombre: alumno?.nombre ?? "",
    alumno_apellido: alumno?.apellido ?? "",
    representante_nombre: persona ? `${persona.nombre} ${persona.apellido}` : "",
    aplicaciones: (aplicaciones ?? []).map((a) => {
      const item = Array.isArray(a.plan_item) ? a.plan_item[0] : a.plan_item;
      return {
        descripcion: item?.descripcion ?? "",
        monto_usd_aplicado: Number(a.monto_usd_aplicado),
      };
    }),
  };
}
