import "server-only";
import { createClient } from "@/lib/supabase/server";

export type SolicitudResumen = {
  id: string;
  alumno_nombre: string;
  alumno_apellido: string;
  representante_nombre: string | null;
  representante_apellido: string | null;
  madre_nombre: string | null;
  madre_apellido: string | null;
  padre_nombre: string | null;
  padre_apellido: string | null;
  estado: "pendiente" | "aprobada" | "rechazada";
  creado_en: string;
};

export async function getSolicitudes(estado: string): Promise<SolicitudResumen[]> {
  const supabase = await createClient();
  let query = supabase
    .from("solicitudes_inscripcion")
    .select(
      "id, alumno_nombre, alumno_apellido, representante_nombre, representante_apellido, madre_nombre, madre_apellido, padre_nombre, padre_apellido, estado, creado_en",
    )
    .order("creado_en", { ascending: false });

  if (estado) query = query.eq("estado", estado);

  const { data } = await query;
  return (data as SolicitudResumen[]) ?? [];
}

/** Representante si vino, si no la madre, si no el padre — para mostrar
 * "algún contacto" en la lista aunque ya no se pida el rol de representante. */
export function contactoVisible(s: SolicitudResumen): string {
  if (s.representante_nombre) return `${s.representante_nombre} ${s.representante_apellido ?? ""}`.trim();
  if (s.madre_nombre) return `${s.madre_nombre} ${s.madre_apellido ?? ""}`.trim();
  if (s.padre_nombre) return `${s.padre_nombre} ${s.padre_apellido ?? ""}`.trim();
  return "—";
}

// Fila completa de la tabla: se usa tal cual en la pantalla de detalle/aprobación.
export type SolicitudDetalle = Record<string, unknown> & {
  id: string;
  estado: "pendiente" | "aprobada" | "rechazada";
  autorizados_retiro_json: {
    nombre: string;
    apellido: string;
    cedula: string;
    telefono: string;
    parentesco: string;
  }[];
};

export async function getSolicitudDetalle(id: string): Promise<SolicitudDetalle | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("solicitudes_inscripcion")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return data as SolicitudDetalle | null;
}
