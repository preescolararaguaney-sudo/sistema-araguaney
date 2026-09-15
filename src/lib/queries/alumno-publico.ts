import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type AlumnoParaFormularioPublico = {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  telefono_contacto_rapido: string | null;
};

/**
 * Único uso legítimo de `createAdminClient` desde una ruta SIN login: la
 * página pública /inscripcion necesita mostrar "estás completando los
 * datos de [nombre]" cuando llega con `?alumno=<id>` (link que el plantel
 * le manda al representante), pero `alumnos` no tiene una política RLS
 * pública. En vez de abrir esa tabla a `anon`, esta función expone
 * explícitamente solo estas 4 columnas — nunca datos_medicos, alergias,
 * dirección, etc. — sin importar qué se le pida a `alumnos` en el futuro.
 */
export async function getAlumnoParaFormularioPublico(
  id: string,
): Promise<AlumnoParaFormularioPublico | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("alumnos")
    .select("id, nombre, apellido, fecha_nacimiento, telefono_contacto_rapido")
    .eq("id", id)
    .maybeSingle();

  return data as AlumnoParaFormularioPublico | null;
}
