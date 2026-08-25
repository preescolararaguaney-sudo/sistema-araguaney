import "server-only";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type DatosPersona = {
  cedula: string;
  nombre: string;
  apellido: string;
  telefono?: string | null;
  email?: string | null;
};

/**
 * Busca una persona por cédula y la reutiliza si ya existe (ej. el
 * representante de pago es también el padre) en vez de violar la
 * restricción unique(cedula) intentando crearla de nuevo. Si existe,
 * refresca nombre/teléfono por si cambiaron.
 */
export async function findOrCreatePersona(
  supabase: SupabaseServerClient,
  datos: DatosPersona,
): Promise<{ id: string } | { error: string }> {
  const cedula = datos.cedula.trim();
  if (!cedula) return { error: "Falta la cédula" };

  const { data: existente } = await supabase
    .from("personas")
    .select("id")
    .eq("cedula", cedula)
    .maybeSingle();

  if (existente) {
    await supabase
      .from("personas")
      .update({
        nombre: datos.nombre,
        apellido: datos.apellido,
        telefono: datos.telefono ?? null,
      })
      .eq("id", existente.id);
    return { id: existente.id };
  }

  const { data: nueva, error } = await supabase
    .from("personas")
    .insert({
      cedula,
      nombre: datos.nombre,
      apellido: datos.apellido,
      telefono: datos.telefono ?? null,
      email: datos.email ?? null,
    })
    .select("id")
    .single();

  if (error || !nueva) return { error: error?.message ?? "No se pudo crear la persona" };
  return { id: nueva.id };
}
