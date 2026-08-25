import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { getPeriodoDetalle } from "@/lib/queries/nomina";
import { createClient } from "@/lib/supabase/server";
import { formatBs, formatFecha, hoyCaracas } from "@/lib/format";
import { NominaForm } from "./nomina-form";
import { AnularReciboForm } from "./anular-recibo-form";

export default async function PeriodoNominaPage({
  params,
}: {
  params: Promise<{ periodoId: string }>;
}) {
  await requireRol(["directora", "administracion"]);
  const { periodoId } = await params;
  const detalle = await getPeriodoDetalle(periodoId);

  if (!detalle) {
    return <p className="text-sm text-red-700">No se encontró el período.</p>;
  }

  const { periodo, pendientes, generados } = detalle;
  const supabase = await createClient();
  const hoy = hoyCaracas();
  const { data: tasaHoy } = await supabase.from("tasas_bcv").select("tasa").eq("fecha", hoy).maybeSingle();

  const totalNeto = generados.filter((g) => !g.anulado).reduce((acc, g) => acc + g.neto_pagar, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/nomina" className="text-xs text-stone-500 hover:underline">
          ← Volver a nómina
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-stone-900">
          Quincena {periodo.quincena} — {periodo.mes}/{periodo.anio}
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          {formatFecha(periodo.fecha_inicio)} – {formatFecha(periodo.fecha_fin)} ·{" "}
          {generados.filter((g) => !g.anulado).length} recibo(s) generado(s) · Total: {formatBs(totalNeto)}
        </p>
      </div>

      {pendientes.length > 0 && (
        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">
            Generar nómina ({pendientes.length} pendiente(s))
          </h2>
          <NominaForm
            periodoId={periodo.id}
            fechaPago={hoy}
            tasaHoy={tasaHoy ? Number(tasaHoy.tasa) : null}
            trabajadores={pendientes}
            mostrarCestaticket={periodo.quincena === 1}
          />
        </section>
      )}

      {generados.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
            Recibos generados
          </p>
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
                  <th className="px-4 py-2 font-medium">Trabajador</th>
                  <th className="px-4 py-2 font-medium">Neto a pagar</th>
                  <th className="px-4 py-2 font-medium"></th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {generados.map((g) => (
                  <tr key={g.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-2">
                      {g.nombre} {g.apellido} {g.anulado && <span className="text-red-600">(anulado)</span>}
                    </td>
                    <td className="px-4 py-2">{formatBs(g.neto_pagar)}</td>
                    <td className="px-4 py-2">
                      <Link href={`/nomina/recibos/${g.id}`} className="text-emerald-700 hover:underline">
                        Ver recibo
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      {!g.anulado && <AnularReciboForm reciboId={g.id} periodoId={periodo.id} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
