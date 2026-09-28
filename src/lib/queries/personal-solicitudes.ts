import "server-only";
import { createClient } from "@/lib/supabase/server";

export type SolicitudPersonalResumen = {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string | null;
  estado: "pendiente" | "aprobada" | "rechazada";
  creado_en: string;
};

export async function getSolicitudesPersonal(estado: string): Promise<SolicitudPersonalResumen[]> {
  const supabase = await createClient();
  let query = supabase
    .from("solicitudes_personal")
    .select("id, nombre, apellido, cedula, estado, creado_en")
    .order("creado_en", { ascending: false });

  if (estado) query = query.eq("estado", estado);

  const { data } = await query;
  return (data as SolicitudPersonalResumen[]) ?? [];
}

// Fila completa de la tabla: se usa tal cual en la pantalla de detalle/aprobación.
export type SolicitudPersonalDetalle = Record<string, unknown> & {
  id: string;
  estado: "pendiente" | "aprobada" | "rechazada";
};

export async function getSolicitudPersonalDetalle(id: string): Promise<SolicitudPersonalDetalle | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("solicitudes_personal")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return data as SolicitudPersonalDetalle | null;
}
