import "server-only";
import { getConceptosDePago, getDescripcionesConceptos, type PagoPendiente } from "@/lib/queries/bandeja";
import { tasaBcvParaFecha } from "@/lib/tasa-bcv";

/**
 * Lo que la ficha de factura necesita además del propio pago: a qué cuota(s)
 * corresponde (las reales si ya se aprobó, las sugeridas si no) y la tasa
 * oficial del BCV vigente el día de la transferencia.
 */
export async function datosFicha(pago: PagoPendiente) {
  const conceptos = pago.pago_id
    ? (await getConceptosDePago(pago.pago_id)).map((c) => c.descripcion)
    : await getDescripcionesConceptos(pago.conceptos_sugeridos);

  const t = pago.fecha_pago ? await tasaBcvParaFecha(pago.fecha_pago) : null;
  const tasa = t && "tasa" in t ? { valor: t.tasa, fechaPublicada: t.fechaTasa } : null;

  return { conceptos, tasa };
}
