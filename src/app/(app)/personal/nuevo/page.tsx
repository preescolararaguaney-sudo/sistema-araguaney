import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TrabajadorForm } from "./trabajador-form";

export default async function NuevoTrabajadorPage() {
  await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const { data: cargos } = await supabase.from("cargos").select("id, nombre").order("nombre");

  return (
    <div>
      <Link href="/personal" className="text-xs text-stone-500 hover:underline">
        ← Volver a personal
      </Link>
      <h1 className="mt-1 mb-4 text-lg font-semibold text-stone-900">Nuevo trabajador</h1>
      <TrabajadorForm cargos={cargos ?? []} />
    </div>
  );
}
