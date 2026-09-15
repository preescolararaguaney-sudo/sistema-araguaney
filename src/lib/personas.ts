import "server-only";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type DatosPersona = {
  cedula: string;
  nombre: string;
  apellido: string;
  telefono?: string | null;
  email?: string | null;
  // Campos de la planilla de inscripción (madre/padre): opcionales porque
  // la creación manual desde /alumnos/nuevo no los pide.
  lugar_nacimiento?: string | null;
  fecha_nacimiento?: string | null;
  estado_civil?: string | null;
  religion?: string | null;
  grado_instruccion?: string | null;
  empresa_donde_labora?: string | null;
  direccion_trabajo?: string | null;
  jefe_inmediato?: string | null;
  departamento_laboral?: string | null;
  antiguedad_laboral?: string | null;
  sueldo?: string | null;
  horario_trabajo?: string | null;
  telefono_habitacion?: string | null;
  telefono_otro?: string | null;
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

  // Solo se incluyen los campos extendidos que este llamador realmente pasó:
  // así una llamada que no los conoce (ej. la creación manual desde
  // /alumnos/nuevo) nunca borra datos laborales/vivienda que ya existían en
  // una persona reutilizada por cédula (ej. cargados antes vía una solicitud
  // de inscripción aprobada).
  const extendidos = {
    lugar_nacimiento: datos.lugar_nacimiento,
    fecha_nacimiento: datos.fecha_nacimiento,
    estado_civil: datos.estado_civil,
    religion: datos.religion,
    grado_instruccion: datos.grado_instruccion,
    empresa_donde_labora: datos.empresa_donde_labora,
    direccion_trabajo: datos.direccion_trabajo,
    jefe_inmediato: datos.jefe_inmediato,
    departamento_laboral: datos.departamento_laboral,
    antiguedad_laboral: datos.antiguedad_laboral,
    sueldo: datos.sueldo,
    horario_trabajo: datos.horario_trabajo,
    telefono_habitacion: datos.telefono_habitacion,
    telefono_otro: datos.telefono_otro,
  };
  const extendidosPasados = Object.fromEntries(
    Object.entries(extendidos).filter(([, v]) => v !== undefined),
  );

  if (existente) {
    await supabase
      .from("personas")
      .update({
        nombre: datos.nombre,
        apellido: datos.apellido,
        telefono: datos.telefono ?? null,
        ...extendidosPasados,
      })
      .eq("id", existente.id);
    return { id: existente.id };
  }

  const extendidosConDefecto = Object.fromEntries(
    Object.keys(extendidos).map((k) => [k, extendidosPasados[k] ?? null]),
  );

  const { data: nueva, error } = await supabase
    .from("personas")
    .insert({
      cedula,
      nombre: datos.nombre,
      apellido: datos.apellido,
      telefono: datos.telefono ?? null,
      email: datos.email ?? null,
      ...extendidosConDefecto,
    })
    .select("id")
    .single();

  if (error || !nueva) return { error: error?.message ?? "No se pudo crear la persona" };
  return { id: nueva.id };
}
