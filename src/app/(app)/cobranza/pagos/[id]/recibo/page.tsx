import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { getReciboDetalle } from "@/lib/queries/pagos";
import { formatBs, formatFecha, formatUsd, METODO_PAGO_LABEL } from "@/lib/format";
import { PrintButton } from "./print-button";

export default async function ReciboPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRol(["directora", "administracion"]);
  const { id } = await params;
  const recibo = await getReciboDetalle(id);

  if (!recibo) {
    return <p className="text-sm text-red-700">No se encontró el recibo.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/cobranza/pagos/nuevo" className="text-xs text-stone-500 hover:underline">
          ← Registrar otro pago
        </Link>
        <PrintButton />
      </div>

      {recibo.anulado && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          Este recibo fue anulado. Motivo: {recibo.motivo_anulacion}
        </p>
      )}

      <div className="mx-auto w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 print:border-none print:shadow-none">
        <div className="text-center">
          <h1 className="text-base font-semibold text-stone-900">Preescolar Araguaney</h1>
          <p className="text-xs text-stone-500">Recibo de pago N.° {recibo.numero_recibo}</p>
        </div>

        <div className="mt-4 flex flex-col gap-1 text-sm text-stone-700">
          <p><span className="text-stone-500">Fecha:</span> {formatFecha(recibo.fecha_pago)}</p>
          <p><span className="text-stone-500">Alumno:</span> {recibo.alumno_nombre} {recibo.alumno_apellido}</p>
          <p><span className="text-stone-500">Representante:</span> {recibo.representante_nombre}</p>
          <p><span className="text-stone-500">Método de pago:</span> {METODO_PAGO_LABEL[recibo.metodo] ?? recibo.metodo}</p>
          {recibo.referencia && (
            <p><span className="text-stone-500">Referencia:</span> {recibo.referencia}</p>
          )}
        </div>

        <div className="mt-4 border-t border-stone-200 pt-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500">
            Aplicado a
          </p>
          <ul className="flex flex-col gap-0.5 text-sm text-stone-700">
            {recibo.aplicaciones.map((a, i) => (
              <li key={i} className="flex justify-between">
                <span>{a.descripcion}</span>
                <span>{formatUsd(a.monto_usd_aplicado)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 border-t border-stone-200 pt-3 text-right">
          <p className="text-xs text-stone-500">
            Tasa BCV: {recibo.tasa_bcv_valor.toFixed(4)} Bs/USD
          </p>
          <p className="text-lg font-semibold text-stone-900">{formatUsd(recibo.monto_usd_total)}</p>
          <p className="text-sm text-stone-600">{formatBs(recibo.monto_bs_total)}</p>
        </div>
      </div>
    </div>
  );
}
