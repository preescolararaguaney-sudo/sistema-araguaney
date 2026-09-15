import Link from "next/link";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAlumnos, getCuposPorAula } from "@/lib/queries/alumnos";
import { CopiarLinksMasivo } from "./copiar-links-form";

const ESTADO_LABEL: Record<string, string> = {
  preinscrito: "Preinscrito",
  inscrito: "Inscrito",
  retirado: "Retirado",
  egresado: "Egresado",
};

export default async function AlumnosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; aula?: string; estado?: string }>;
}) {
  const perfil = await getPerfil();
  const { q = "", aula = "", estado = "" } = await searchParams;
  const supabase = await createClient();
  const esAdmin = perfil?.rol === "directora" || perfil?.rol === "administracion";

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
        {esAdmin && (
          <p className="mt-2 text-sm text-amber-800">
            Créalo en{" "}
            <Link href="/configuracion/calendario" className="underline">
              Año escolar y lapsos
            </Link>
            .
          </p>
        )}
      </div>
    );
  }

  const [alumnos, aulas, cupos] = await Promise.all([
    getAlumnos(anioEscolar.id, { q, aulaId: aula || undefined, estado: estado || undefined }),
    supabase.from("aulas").select("id, nombre").eq("activa", true).order("nombre"),
    esAdmin ? getCuposPorAula(anioEscolar.id) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">
            Alumnos — {anioEscolar.nombre}
          </h1>
          <p className="mt-1 text-sm text-stone-600">{alumnos.length} resultado(s)</p>
        </div>
        {esAdmin && (
          <div className="flex gap-2">
            <CopiarLinksMasivo alumnos={alumnos} />
            <Link
              href="/alumnos/nuevo"
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              + Nuevo alumno
            </Link>
          </div>
        )}
      </div>

      {esAdmin && cupos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {cupos.map((c) => (
            <div key={c.aula_id} className="rounded-lg border border-stone-200 bg-white p-3">
              <p className="text-xs font-medium text-stone-500">{c.aula_nombre}</p>
              <p className="text-lg font-semibold text-stone-900">
                {c.inscritos}
                <span className="text-sm font-normal text-stone-400">
                  {c.capacidad > 0 ? ` / ${c.capacidad}` : ""}
                </span>
              </p>
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
            placeholder="Nombre del alumno o representante..."
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Aula</span>
          <select
            name="aula"
            defaultValue={aula}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todas</option>
            {(aulas.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </label>
        {esAdmin && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-stone-500">Estado</span>
            <select
              name="estado"
              defaultValue={estado}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
            >
              <option value="">Todos</option>
              {Object.entries(ESTADO_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        )}
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
              <th className="px-4 py-2 font-medium">Alumno</th>
              <th className="px-4 py-2 font-medium">Aula</th>
              {esAdmin && <th className="px-4 py-2 font-medium">Representante</th>}
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {alumnos.map((a) => (
              <tr key={a.matricula_id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-2">{a.nombre} {a.apellido}</td>
                <td className="px-4 py-2">{a.aula_nombre}</td>
                {esAdmin && <td className="px-4 py-2">{a.representante_nombre}</td>}
                <td className="px-4 py-2">{ESTADO_LABEL[a.estado] ?? a.estado}</td>
                <td className="px-4 py-2">
                  <Link href={`/alumnos/${a.alumno_id}`} className="text-emerald-700 hover:underline">
                    Ver ficha
                  </Link>
                </td>
              </tr>
            ))}
            {alumnos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-center text-stone-500">
                  Sin alumnos que coincidan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
