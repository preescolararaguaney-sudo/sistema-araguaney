import Link from "next/link";
import { getAulasPublico } from "@/lib/queries/pagos-publico";

export default async function PagosPublicoPage() {
  const aulas = await getAulasPublico();

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <h1 className="text-xl font-semibold text-stone-900">
        Registrar pago — Preescolar Araguaney
      </h1>
      <p className="mt-2 mb-6 text-sm text-stone-600">
        Selecciona el aula del alumno para buscarlo.
      </p>
      <div className="flex flex-col gap-2">
        {aulas.map((a) => (
          <Link
            key={a.id}
            href={`/pagos-publico/aula/${a.id}`}
            className="rounded-md border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-900 hover:bg-stone-50"
          >
            {a.nombre}
          </Link>
        ))}
        {aulas.length === 0 && (
          <p className="text-sm text-stone-500">No hay aulas activas.</p>
        )}
      </div>
    </div>
  );
}
