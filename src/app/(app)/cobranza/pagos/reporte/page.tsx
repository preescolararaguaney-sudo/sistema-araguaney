import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { filtroDesdeParams, getReportePagos, totalesPagos } from "@/lib/queries/reporte-pagos";
import { formatBs, formatFecha, formatUsd, hoyCaracas, METODO_PAGO_LABEL } from "@/lib/format";

const INPUT = "rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600";

export default async function ReportePagosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRol(["directora", "administracion"]);
  const params = await searchParams;
  const filtro = filtroDesdeParams(params, hoyCaracas());

  const filas = await getReportePagos(filtro);
  const totales = totalesPagos(filas);

  const qs = new URLSearchParams(
    Object.entries({
      desde: filtro.desde,
      hasta: filtro.hasta,
      metodo: filtro.metodo,
      moneda: filtro.moneda,
      q: filtro.q,
      sin_factura: filtro.sinFactura ? "1" : undefined,
      anulados: filtro.incluirAnulados ? "1" : undefined,
    }).filter((e): e is [string, string] => Boolean(e[1])),
  ).toString();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Pagos recibidos</h1>
          <p className="mt-1 text-sm text-stone-600">
            Quién pagó, cuándo y cómo, con la tasa del BCV y la factura de cada pago.
          </p>
        </div>
        <Link
          href={`/cobranza/pagos/reporte/exportar?${qs}`}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Exportar a Excel
        </Link>
      </div>

      <form method="get" className="grid grid-cols-1 gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Desde</span>
          <input type="date" name="desde" defaultValue={filtro.desde} className={INPUT} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Hasta</span>
          <input type="date" name="hasta" defaultValue={filtro.hasta} className={INPUT} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Método</span>
          <select name="metodo" defaultValue={filtro.metodo ?? ""} className={INPUT}>
            <option value="">Todos</option>
            {Object.entries(METODO_PAGO_LABEL).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Moneda</span>
          <select name="moneda" defaultValue={filtro.moneda ?? ""} className={INPUT}>
            <option value="">Todas</option>
            <option value="BS">Bolívares</option>
            <option value="USD">Dólares</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs text-stone-500">Buscar (alumno, a quién se factura, cédula, referencia, banco)</span>
          <input type="search" name="q" defaultValue={filtro.q ?? ""} className={INPUT} />
        </label>
        <div className="flex flex-wrap items-end gap-4 text-sm text-stone-700 sm:col-span-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="sin_factura" value="1" defaultChecked={filtro.sinFactura} />
            Solo sin n.º de factura
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="anulados" value="1" defaultChecked={filtro.incluirAnulados} />
            Incluir anulados
          </label>
          <button
            type="submit"
            className="ml-auto rounded-md border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
          >
            Filtrar
          </button>
        </div>
      </form>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Total etiqueta="Pagos" valor={String(totales.cantidad)} />
        <Total
          etiqueta="Recibido en bolívares"
          valor={formatBs(totales.bsRecibido)}
          detalle={`≈ ${formatUsd(totales.bsEnUsd)} al BCV de cada día`}
        />
        <Total etiqueta="Recibido en dólares" valor={formatUsd(totales.usdRecibido)} />
        <Total
          etiqueta="Sin n.º de factura"
          valor={String(totales.sinFactura)}
          alerta={totales.sinFactura > 0}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Alumno</th>
              <th className="px-3 py-2 font-medium">Facturar a</th>
              <th className="px-3 py-2 font-medium">Cómo pagó</th>
              <th className="px-3 py-2 font-medium">Referencia</th>
              <th className="px-3 py-2 text-right font-medium">Bs</th>
              <th className="px-3 py-2 text-right font-medium">Tasa</th>
              <th className="px-3 py-2 text-right font-medium">USD</th>
              <th className="px-3 py-2 font-medium">Concepto</th>
              <th className="px-3 py-2 font-medium">Factura</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((p) => (
              <tr key={p.id} className={`border-b border-stone-100 align-top last:border-0 ${p.anulado ? "text-stone-400 line-through" : ""}`}>
                <td className="px-3 py-2 whitespace-nowrap">
                  <Link href={`/cobranza/pagos/${p.id}/recibo`} className="text-emerald-700 hover:underline">
                    {formatFecha(p.fecha_pago)}
                  </Link>
                  <div className="text-xs text-stone-400">Recibo {p.numero_recibo}</div>
                </td>
                <td className="px-3 py-2">
                  {p.alumno}
                  <div className="text-xs text-stone-500">{p.aula}</div>
                </td>
                <td className="px-3 py-2">
                  {p.facturar_a || <span className="text-stone-400">—</span>}
                  {p.facturar_cedula && <div className="text-xs text-stone-500">{p.facturar_cedula}</div>}
                </td>
                <td className="px-3 py-2">
                  {METODO_PAGO_LABEL[p.metodo] ?? p.metodo}
                  {p.banco && <div className="text-xs text-stone-500">{p.banco}</div>}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{p.referencia || "—"}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">{p.monto_bs != null ? formatBs(p.monto_bs) : "—"}</td>
                <td className="px-3 py-2 text-right text-xs text-stone-500">
                  {p.moneda === "BS" ? p.tasa.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : "—"}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap font-medium">{formatUsd(p.monto_usd)}</td>
                <td className="px-3 py-2 text-xs">{p.conceptos || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs">
                  {p.factura_numero ? (
                    <>
                      N.º {p.factura_numero}
                      {p.factura_control && <div className="text-stone-500">Control {p.factura_control}</div>}
                    </>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800">Sin factura</span>
                  )}
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-4 text-center text-stone-500">
                  No hay pagos con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Total({
  etiqueta,
  valor,
  detalle,
  alerta,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  alerta?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${alerta ? "border-amber-200 bg-amber-50" : "border-stone-200 bg-white"}`}>
      <p className="text-xs text-stone-500">{etiqueta}</p>
      <p className="mt-1 text-lg font-semibold text-stone-900">{valor}</p>
      {detalle && <p className="text-xs text-stone-500">{detalle}</p>}
    </div>
  );
}
