import Link from "next/link";
import type { MatriculaResultado } from "@/lib/queries/matriculas";

/** Buscador de alumno/representante reutilizado por pagos y estado de cuenta.
 * Es una búsqueda por GET (sin JS) para mantenerlo simple y funcionar bien
 * también desde el teléfono con conexión lenta. */
export function BuscadorAlumno({
  basePath,
  q,
  resultados,
}: {
  basePath: string;
  q: string;
  resultados: MatriculaResultado[];
}) {
  return (
    <div>
      <form method="get" className="flex gap-2">
        <input
          name="q"
          type="text"
          defaultValue={q}
          placeholder="Nombre del alumno, del representante o cédula..."
          className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
        />
        <button
          type="submit"
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Buscar
        </button>
      </form>

      {q && resultados.length === 0 && (
        <p className="mt-4 text-sm text-stone-500">Sin resultados para &ldquo;{q}&rdquo;.</p>
      )}

      {resultados.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {resultados.map((r) => (
            <li key={r.matricula_id}>
              <Link
                href={`${basePath}?matricula=${r.matricula_id}`}
                className="block rounded-lg border border-stone-200 bg-white px-4 py-3 hover:border-emerald-300 hover:bg-emerald-50"
              >
                <p className="text-sm font-medium text-stone-900">
                  {r.alumno_nombre} {r.alumno_apellido}
                  <span className="ml-2 font-normal text-stone-500">— {r.aula_nombre}</span>
                </p>
                <p className="text-xs text-stone-500">
                  Representante: {r.representante_nombre}
                  {r.representante_cedula ? ` (${r.representante_cedula})` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
