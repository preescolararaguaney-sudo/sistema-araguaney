import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { getPeriodos } from "@/lib/queries/nomina";
import { formatFecha } from "@/lib/format";
import { irAPeriodoActual } from "./actions";

const ESTADO_LABEL: Record<string, string> = {
  abierto: "Abierto",
  cerrado: "Cerrado",
  pagado: "Pagado",
};

export default async function NominaPage() {
  await requireRol(["directora", "administracion"]);
  const periodos = await getPeriodos();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Nómina</h1>
          <p className="mt-1 text-sm text-stone-600">Períodos quincenales.</p>
        </div>
        <form action={irAPeriodoActual}>
          <button
            type="submit"
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Ir a la quincena actual
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="px-4 py-2 font-medium">Período</th>
              <th className="px-4 py-2 font-medium">Fechas</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {periodos.map((p) => (
              <tr key={p.id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-2">
                  Quincena {p.quincena} — {p.mes}/{p.anio}
                </td>
                <td className="px-4 py-2">
                  {formatFecha(p.fecha_inicio)} – {formatFecha(p.fecha_fin)}
                </td>
                <td className="px-4 py-2">{ESTADO_LABEL[p.estado] ?? p.estado}</td>
                <td className="px-4 py-2">
                  <Link href={`/nomina/${p.id}`} className="text-emerald-700 hover:underline">
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
            {periodos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-3 text-center text-stone-500">
                  Sin períodos creados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
