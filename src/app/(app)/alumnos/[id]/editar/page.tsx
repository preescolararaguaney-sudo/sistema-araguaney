import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { getAlumnoEditable } from "@/lib/queries/alumno-editar";
import { createClient } from "@/lib/supabase/server";
import { EditarForm } from "./editar-form";

export default async function EditarAlumnoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRol(["directora", "administracion"]);
  const { id } = await params;
  const ficha = await getAlumnoEditable(id);

  if (!ficha) {
    return <p className="text-sm text-red-700">No se encontró el alumno.</p>;
  }

  const supabase = await createClient();
  const { data: aulas } = await supabase.from("aulas").select("id, nombre").eq("activa", true).order("nombre");

  return (
    <div>
      <Link href={`/alumnos/${id}`} className="text-xs text-stone-500 hover:underline">
        ← Volver a la ficha
      </Link>
      <h1 className="mt-1 mb-4 text-lg font-semibold text-stone-900">
        Editar — {ficha.nombre} {ficha.apellido}
      </h1>
      <EditarForm ficha={ficha} aulas={aulas ?? []} />
    </div>
  );
}
