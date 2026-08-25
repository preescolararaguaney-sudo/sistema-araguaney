import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatFecha, formatUsd } from "@/lib/format";
import { CrearAnioForm } from "./crear-anio-form";
import { LapsoForm } from "./lapso-form";

export default async function CalendarioPage() {
  await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const { data: anios } = await supabase
    .from("anios_escolares")
    .select("id, nombre, fecha_inicio, fecha_fin, activo")
    .order("fecha_inicio", { ascending: false });

  if (!anios || anios.length === 0) {
    return (
      <div>
        <h1 className="text-lg font-semibold text-stone-900">Año escolar y lapsos</h1>
        <p className="mt-1 text-sm text-stone-600">
          Todavía no hay ningún año escolar creado.
        </p>
        <div className="mt-4">
          <CrearAnioForm />
        </div>
      </div>
    );
  }

  const anioActivo = anios.find((a) => a.activo) ?? anios[0];

  const { data: lapsos } = await supabase
    .from("lapsos")
    .select("id, numero, fecha_inicio, fecha_cierre")
    .eq("anio_escolar_id", anioActivo.id)
    .order("numero");

  const { data: precios } = await supabase
    .from("precios")
    .select("concepto, monto_usd, vigente_desde")
    .eq("anio_escolar_id", anioActivo.id)
    .order("vigente_desde", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-stone-900">Año escolar y lapsos</h1>
        <p className="mt-1 text-sm text-stone-600">
          Año activo: <span className="font-medium">{anioActivo.nombre}</span> (
          {formatFecha(anioActivo.fecha_inicio)} – {formatFecha(anioActivo.fecha_fin)})
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
          Lapsos — al cambiar la fecha de cierre, las cuotas de agosto pendientes
          vinculadas a ese lapso se recalculan automáticamente
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(lapsos ?? []).map((l) => (
            <LapsoForm
              key={l.id}
              id={l.id}
              numero={l.numero}
              fechaInicio={l.fecha_inicio}
              fechaCierre={l.fecha_cierre}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
          Precios vigentes
        </p>
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="px-4 py-2 font-medium">Concepto</th>
                <th className="px-4 py-2 font-medium">Monto</th>
                <th className="px-4 py-2 font-medium">Vigente desde</th>
              </tr>
            </thead>
            <tbody>
              {(precios ?? []).map((p, i) => (
                <tr key={i} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-2 capitalize">{p.concepto}</td>
                  <td className="px-4 py-2">{formatUsd(Number(p.monto_usd))}</td>
                  <td className="px-4 py-2">{formatFecha(p.vigente_desde)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
