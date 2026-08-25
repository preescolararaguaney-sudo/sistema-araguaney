import { requireRol } from "@/lib/auth";
import { getCierreMes } from "@/lib/queries/cierre";
import { formatBs, formatUsd, hoyCaracas, METODO_PAGO_LABEL } from "@/lib/format";

export default async function CierreMesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  await requireRol(["directora", "administracion"]);
  const { mes = hoyCaracas().slice(0, 7) } = await searchParams;
  const cierre = await getCierreMes(mes);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Cierre de mes</h1>
          <p className="mt-1 text-sm text-stone-600">
            {cierre.cantidadPagos} pago(s) registrados en el período.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <form method="get" className="flex items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-stone-500">Mes</span>
              <input
                name="mes"
                type="month"
                defaultValue={mes}
                className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </label>
            <button
              type="submit"
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
            >
              Ver
            </button>
          </form>
          <a
            href={`/cobranza/cierre/exportar?mes=${mes}`}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
          >
            Exportar a Excel
          </a>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="px-4 py-2 font-medium">Método de pago</th>
              <th className="px-4 py-2 font-medium">Cantidad</th>
              <th className="px-4 py-2 font-medium">Total USD</th>
              <th className="px-4 py-2 font-medium">Total Bs</th>
            </tr>
          </thead>
          <tbody>
            {cierre.porMetodo.map((m) => (
              <tr key={m.metodo} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-2">{METODO_PAGO_LABEL[m.metodo] ?? m.metodo}</td>
                <td className="px-4 py-2">{m.cantidad}</td>
                <td className="px-4 py-2">{formatUsd(m.total_usd)}</td>
                <td className="px-4 py-2">{formatBs(m.total_bs)}</td>
              </tr>
            ))}
            {cierre.porMetodo.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-3 text-center text-stone-500">
                  Sin pagos en este período.
                </td>
              </tr>
            )}
          </tbody>
          {cierre.porMetodo.length > 0 && (
            <tfoot>
              <tr className="border-t border-stone-300 font-semibold text-stone-900">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2">{cierre.cantidadPagos}</td>
                <td className="px-4 py-2">{formatUsd(cierre.totalUsd)}</td>
                <td className="px-4 py-2">{formatBs(cierre.totalBs)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
