import "server-only";
import { getConceptosDePago, getDescripcionesConceptos, type PagoPendiente } from "@/lib/queries/bandeja";
import { tasaBcvParaFecha } from "@/lib/tasa-bcv";

/**
 * Lo que la ficha de factura necesita además del propio pago: a qué cuota(s)
 * corresponde (las reales si ya se aprobó, las sugeridas si no) y la tasa
 * oficial del BCV vigente el día de la transferencia.
 */
export async function datosFicha(pago: PagoPendiente) {
  const deCuotas = pago.pago_id
    ? (await getConceptosDePago(pago.pago_id)).map((c) => c.descripcion)
    : await getDescripcionesConceptos(pago.conceptos_sugeridos);
  // La parte que no es cuota (fiesta, helado, insignia...) se factura con su concepto libre.
  const libre = pago.concepto_libre
    ? [
        deCuotas.length > 0 && pago.monto_libre_usd
          ? pago.concepto_libre + " (USD " + pago.monto_libre_usd.toFixed(2) + ")"
          : pago.concepto_libre,
      ]
    : [];
  const conceptos = [...deCuotas, ...libre];

  const t = pago.fecha_pago ? await tasaBcvParaFecha(pago.fecha_pago) : null;
  const tasa = t && "tasa" in t ? { valor: t.tasa, fechaPublicada: t.fechaTasa } : null;

  return { conceptos, tasa };
}
