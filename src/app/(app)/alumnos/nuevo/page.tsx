import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AlumnoForm } from "./alumno-form";

export default async function NuevoAlumnoPage() {
  await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const { data: anioEscolar } = await supabase
    .from("anios_escolares")
    .select("id, nombre")
    .eq("activo", true)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: aulas } = await supabase
    .from("aulas")
    .select("id, nombre")
    .eq("activa", true)
    .order("nombre");

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

  return (
    <div>
      <Link href="/alumnos" className="text-xs text-stone-500 hover:underline">
        ← Volver a alumnos
      </Link>
      <h1 className="mt-1 text-lg font-semibold text-stone-900">
        Nuevo alumno — {anioEscolar.nombre}
      </h1>
      <p className="mt-1 mb-4 text-sm text-stone-600">
        Ficha completa: representante, padre, madre, autorizados a retirar y
        datos médicos.
      </p>
      <AlumnoForm aulas={aulas ?? []} anioEscolarId={anioEscolar.id} />
    </div>
  );
}
