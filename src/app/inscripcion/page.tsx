import { createClient } from "@/lib/supabase/server";
import { InscripcionForm } from "./inscripcion-form";

export default async function InscripcionPublicaPage() {
  const supabase = await createClient();

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
        Planilla de inscripción — Preescolar Araguaney
      </h1>
      <p className="mt-2 mb-6 text-sm text-stone-600">
        Completa los datos del alumno, de la madre, del padre y de las
        personas autorizadas a retirarlo. El plantel revisará tu solicitud y
        se pondrá en contacto contigo para confirmar la inscripción.
      </p>
      <InscripcionForm anioEscolarId={anioEscolar?.id ?? ""} />
    </div>
  );
}
