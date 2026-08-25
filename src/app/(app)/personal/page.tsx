import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTrabajadores, getConteoPorCargo } from "@/lib/queries/personal";

const ESTADO_LABEL: Record<string, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  reposo: "Reposo",
  vacaciones: "Vacaciones",
  permiso: "Permiso",
};

export default async function PersonalPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cargo?: string; estado?: string }>;
}) {
  await requireRol(["directora", "administracion"]);
  const { q = "", cargo = "", estado = "" } = await searchParams;
  const supabase = await createClient();

  const [trabajadores, cargos, conteos] = await Promise.all([
    getTrabajadores({ q, cargoId: cargo || undefined, estado: estado || undefined }),
    supabase.from("cargos").select("id, nombre").order("nombre"),
    getConteoPorCargo(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Personal</h1>
          <p className="mt-1 text-sm text-stone-600">{trabajadores.length} resultado(s)</p>
        </div>
        <Link
          href="/personal/nuevo"
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          + Nuevo trabajador
        </Link>
      </div>

      {conteos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {conteos.map((c) => (
            <div key={c.cargo_id} className="rounded-lg border border-stone-200 bg-white p-3">
              <p className="text-xs font-medium text-stone-500">{c.cargo_nombre}</p>
              <p className="text-lg font-semibold text-stone-900">{c.activos}</p>
            </div>
          ))}
        </div>
      )}

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Buscar</span>
          <input
            name="q"
            type="text"
            defaultValue={q}
            placeholder="Nombre o cédula..."
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Cargo</span>
          <select name="cargo" defaultValue={cargo} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm">
            <option value="">Todos</option>
            {(cargos.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Estado</span>
          <select name="estado" defaultValue={estado} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm">
            <option value="">Todos</option>
            {Object.entries(ESTADO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
        >
          Filtrar
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Cédula</th>
              <th className="px-4 py-2 font-medium">Cargo</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {trabajadores.map((t) => (
              <tr key={t.id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-2">{t.nombre} {t.apellido}</td>
                <td className="px-4 py-2">{t.cedula}</td>
                <td className="px-4 py-2">{t.cargo_nombre}</td>
                <td className="px-4 py-2">{ESTADO_LABEL[t.estado] ?? t.estado}</td>
                <td className="px-4 py-2">
                  <Link href={`/personal/${t.id}`} className="text-emerald-700 hover:underline">
                    Ver ficha
                  </Link>
                </td>
              </tr>
            ))}
            {trabajadores.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-center text-stone-500">
                  Sin trabajadores que coincidan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
