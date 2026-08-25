import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { getReciboNominaDetalle } from "@/lib/queries/nomina";
import { formatBs, formatFecha } from "@/lib/format";
import { PrintButton } from "./print-button";

const CONCEPTO_LABEL: Record<string, string> = {
  salario_formal: "Salario básico por días trabajados y descanso",
  ivss: "Seguro Social Obligatorio",
  rpe: "Régimen Prestacional del Empleo",
  faov: "Fondo de Ahorro Obligatorio para la Vivienda",
  bono: "Bono complementario",
  cestaticket: "Cestaticket",
};

export default async function ReciboNominaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRol(["directora", "administracion"]);
  const { id } = await params;
  const recibo = await getReciboNominaDetalle(id);

  if (!recibo) {
    return <p className="text-sm text-red-700">No se encontró el recibo.</p>;
  }

  const asignaciones = recibo.detalle.filter((d) => d.tipo === "asignacion");
  const deducciones = recibo.detalle.filter((d) => d.tipo === "deduccion");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/nomina/${recibo.periodo.id}`} className="text-xs text-stone-500 hover:underline">
          ← Volver al período
        </Link>
        <PrintButton />
      </div>

      {recibo.anulado && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          Este recibo fue anulado. Motivo: {recibo.motivo_anulacion}
        </p>
      )}

      <div className="mx-auto w-full max-w-lg rounded-xl border border-stone-200 bg-white p-6 print:border-none print:shadow-none">
        <div className="text-center">
          <h1 className="text-base font-semibold text-stone-900">RECIBO DE PAGO DE NÓMINA</h1>
          <p className="text-xs text-stone-500">Uep. Colegio Araguaney, c.a.</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-stone-700">
          <p><span className="text-stone-500">Trabajador:</span> {recibo.trabajador_nombre} {recibo.trabajador_apellido}</p>
          <p><span className="text-stone-500">Cédula:</span> {recibo.trabajador_cedula}</p>
          <p><span className="text-stone-500">Cargo:</span> {recibo.cargo_nombre}</p>
          <p><span className="text-stone-500">Período:</span> {formatFecha(recibo.periodo.fecha_inicio)} – {formatFecha(recibo.periodo.fecha_fin)}</p>
          <p><span className="text-stone-500">Tasa BCV:</span> {recibo.tasa_bcv_valor.toFixed(4)} Bs/USD</p>
        </div>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-stone-300 text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="py-1">Concepto</th>
              <th className="py-1 text-right">Asignaciones</th>
              <th className="py-1 text-right">Deducciones</th>
            </tr>
          </thead>
          <tbody>
            {asignaciones.map((a, i) => (
              <tr key={`a${i}`} className="border-b border-stone-100">
                <td className="py-1">{CONCEPTO_LABEL[a.codigo] ?? a.nombre}</td>
                <td className="py-1 text-right">{formatBs(a.monto)}</td>
                <td className="py-1 text-right"></td>
              </tr>
            ))}
            {deducciones.map((d, i) => (
              <tr key={`d${i}`} className="border-b border-stone-100">
                <td className="py-1">{CONCEPTO_LABEL[d.codigo] ?? d.nombre}</td>
                <td className="py-1 text-right"></td>
                <td className="py-1 text-right">{formatBs(d.monto)}</td>
              </tr>
            ))}
            <tr className="border-t border-stone-300 font-medium">
              <td className="py-1">Totales</td>
              <td className="py-1 text-right">{formatBs(recibo.total_asignaciones)}</td>
              <td className="py-1 text-right">{formatBs(recibo.total_deducciones)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-3 border-t border-stone-300 pt-3 text-right">
          <p className="text-xs text-stone-500">Neto a pagar</p>
          <p className="text-lg font-semibold text-stone-900">{formatBs(recibo.neto_pagar)}</p>
        </div>

        <p className="mt-6 text-xs text-stone-500">
          Certifico el pago por los conceptos mencionados anteriormente quedando conforme.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 text-xs text-stone-500">
          <p>Nombre: _____________________ Cédula: _____________</p>
          <p>Firma: _____________________</p>
        </div>
      </div>
    </div>
  );
}
