import Link from "next/link";
import { notFound } from "next/navigation";
import { getAulasPublico, getAlumnosPorAulaPublico } from "@/lib/queries/pagos-publico";

export default async function AulaPagosPublicoPage({
  params,
}: {
  params: Promise<{ aulaId: string }>;
}) {
  const { aulaId } = await params;
  const [aulas, alumnos] = await Promise.all([
    getAulasPublico(),
    getAlumnosPorAulaPublico(aulaId),
  ]);
  const aula = aulas.find((a) => a.id === aulaId);
  if (!aula) notFound();

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <Link href="/pagos-publico" className="text-xs text-stone-500 hover:underline">
        ← Elegir otra aula
      </Link>
      <h1 className="mt-1 mb-6 text-xl font-semibold text-stone-900">{aula.nombre}</h1>
      <div className="flex flex-col gap-2">
        {alumnos.map((al) => (
          <Link
            key={al.matricula_id}
            href={`/pagos-publico/alumno/${al.matricula_id}`}
            className="rounded-md border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-900 hover:bg-stone-50"
          >
            {al.nombre} {al.apellido}
          </Link>
        ))}
        {alumnos.length === 0 && (
          <p className="text-sm text-stone-500">No hay alumnos inscritos en esta aula.</p>
        )}
      </div>
    </div>
  );
}
