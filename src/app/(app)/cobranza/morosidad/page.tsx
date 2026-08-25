import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMorosos } from "@/lib/queries/morosidad";
import { formatUsd } from "@/lib/format";

export default async function MorosidadPage() {
  await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const { data: anioEscolar } = await supabase
    .from("anios_escolares")
    .select("id, nombre")
    .eq("activo", true)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!anioEscolar) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-base font-semibold text-amber-900">
          No hay un año escolar activo
        </h1>
        <p className="mt-2 text-sm text-amber-800">
          Créalo en{" "}
          <Link href="/configuracion/calendario" className="underline">
            Año escolar y lapsos
          </Link>
          .
        </p>
      </div>
    );
  }

  const morosos = await getMorosos(anioEscolar.id);
  const totalGeneral = morosos.reduce((acc, m) => acc + m.total_vencido_usd, 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">
            Morosidad — {anioEscolar.nombre}
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            {morosos.length} representante(s) con cuotas vencidas · Total: {formatUsd(totalGeneral)}
          </p>
        </div>
        <a
          href="/cobranza/morosidad/exportar"
          className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
        >
          Exportar a Excel
        </a>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="px-4 py-2 font-medium">Alumno</th>
              <th className="px-4 py-2 font-medium">Aula</th>
              <th className="px-4 py-2 font-medium">Representante</th>
              <th className="px-4 py-2 font-medium">Teléfono</th>
              <th className="px-4 py-2 font-medium">Cuotas vencidas</th>
              <th className="px-4 py-2 font-medium">Total vencido</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {morosos.map((m) => (
              <tr key={m.matricula_id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-2">{m.alumno_nombre} {m.alumno_apellido}</td>
                <td className="px-4 py-2">{m.aula_nombre}</td>
                <td className="px-4 py-2">{m.representante_nombre}</td>
                <td className="px-4 py-2">{m.representante_telefono ?? "—"}</td>
                <td className="px-4 py-2">{m.cuotas_vencidas}</td>
                <td className="px-4 py-2 font-medium text-red-700">
                  {formatUsd(m.total_vencido_usd)}
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/cobranza/estado-cuenta?matricula=${m.matricula_id}`}
                    className="text-emerald-700 hover:underline"
                  >
                    Ver cuenta
                  </Link>
                </td>
              </tr>
            ))}
            {morosos.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-3 text-center text-stone-500">
                  Sin representantes morosos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
