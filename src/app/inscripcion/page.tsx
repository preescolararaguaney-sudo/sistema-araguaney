import { createClient } from "@/lib/supabase/server";
import { getAlumnoParaFormularioPublico } from "@/lib/queries/alumno-publico";
import { InscripcionForm } from "./inscripcion-form";

export default async function InscripcionPublicaPage({
  searchParams,
}: {
  searchParams: Promise<{ alumno?: string }>;
}) {
  const { alumno: alumnoId } = await searchParams;
  const supabase = await createClient();

  const alumnoExistente = alumnoId ? await getAlumnoParaFormularioPublico(alumnoId) : null;

  if (alumnoId && !alumnoExistente) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="text-lg font-semibold text-stone-900">Enlace no válido</h1>
        <p className="mt-2 text-sm text-stone-600">
          Este enlace no corresponde a ningún alumno. Pide al plantel que te
          lo vuelva a enviar.
        </p>
      </div>
    );
  }

  const { data: anioEscolar } = await supabase
    .from("anios_escolares")
    .select("id, nombre")
    .eq("activo", true)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-stone-900">
        {alumnoExistente
          ? `Completar datos — ${alumnoExistente.nombre} ${alumnoExistente.apellido}`
          : "Planilla de inscripción — Preescolar Araguaney"}
      </h1>
      <p className="mt-2 mb-6 text-sm text-stone-600">
        {alumnoExistente
          ? "Confirma o corrige los datos del alumno y completa la información de contacto (representante, padres y autorizados a retirar). El plantel revisará los cambios antes de guardarlos."
          : "Completa los datos del alumno, de la madre, del padre y de las personas autorizadas a retirarlo. El plantel revisará tu solicitud y se pondrá en contacto contigo para confirmar la inscripción."}
      </p>
      <InscripcionForm anioEscolarId={anioEscolar?.id ?? ""} alumnoExistente={alumnoExistente} />
    </div>
  );
}
