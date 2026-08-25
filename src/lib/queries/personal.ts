import "server-only";
import { createClient } from "@/lib/supabase/server";

export type TrabajadorFila = {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  cargo_nombre: string;
  estado: string;
};

export async function getTrabajadores(
  filtros: { cargoId?: string; estado?: string; q?: string } = {},
): Promise<TrabajadorFila[]> {
  const supabase = await createClient();

  let query = supabase
    .from("trabajadores")
    .select("id, nombre, apellido, cedula, estado, cargo:cargos!inner(nombre)");

  if (filtros.cargoId) query = query.eq("cargo_id", filtros.cargoId);
  if (filtros.estado) query = query.eq("estado", filtros.estado);
  if (filtros.q) query = query.or(`nombre.ilike.%${filtros.q}%,apellido.ilike.%${filtros.q}%,cedula.ilike.%${filtros.q}%`);

  const { data, error } = await query;
  if (error || !data) return [];

  const filas = data.map((t) => {
    const cargo = Array.isArray(t.cargo) ? t.cargo[0] : t.cargo;
    return {
      id: t.id,
      nombre: t.nombre,
      apellido: t.apellido,
      cedula: t.cedula,
      cargo_nombre: cargo?.nombre ?? "",
      estado: t.estado,
    };
  });

  return filas.sort((a, b) => a.apellido.localeCompare(b.apellido) || a.nombre.localeCompare(b.nombre));
}

export type ConteoCargo = { cargo_id: string; cargo_nombre: string; activos: number };

export async function getConteoPorCargo(): Promise<ConteoCargo[]> {
  const supabase = await createClient();

  const { data: cargos } = await supabase.from("cargos").select("id, nombre").order("nombre");
  const { data: trabajadores } = await supabase
    .from("trabajadores")
    .select("cargo_id")
    .neq("estado", "inactivo");

  const conteos = new Map<string, number>();
  for (const t of trabajadores ?? []) {
    conteos.set(t.cargo_id, (conteos.get(t.cargo_id) ?? 0) + 1);
  }

  return (cargos ?? [])
    .map((c) => ({ cargo_id: c.id, cargo_nombre: c.nombre, activos: conteos.get(c.id) ?? 0 }))
    .filter((c) => c.activos > 0);
}

export type NovedadFila = {
  id: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string | null;
};

export type AulaAsignada = {
  id: string;
  aula_id: string;
  aula_nombre: string;
  rol_en_aula: string;
  vigente_desde: string;
  vigente_hasta: string | null;
};

export type TrabajadorFicha = {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string | null;
  direccion: string | null;
  cargo_id: string;
  cargo_nombre: string;
  fecha_ingreso: string;
  fecha_egreso: string | null;
  tipo_contrato: string;
  salario_base_mensual: number;
  salario_formal_mensual_usd: number | null;
  banco: string | null;
  numero_cuenta: string | null;
  estado: string;
  tienePerfil: boolean;
  novedades: NovedadFila[];
  aulas: AulaAsignada[];
};

export async function getTrabajadorFicha(id: string): Promise<TrabajadorFicha | null> {
  const supabase = await createClient();

  const { data: t, error } = await supabase
    .from("trabajadores")
    .select(
      `id, nombre, apellido, cedula, telefono, direccion, cargo_id, fecha_ingreso, fecha_egreso,
       tipo_contrato, salario_base_mensual, salario_formal_mensual_usd, banco, numero_cuenta, estado,
       cargo:cargos!inner(nombre)`,
    )
    .eq("id", id)
    .single();

  if (error || !t) return null;

  const cargo = Array.isArray(t.cargo) ? t.cargo[0] : t.cargo;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id")
    .eq("trabajador_id", id)
    .maybeSingle();

  const { data: novedades } = await supabase
    .from("trabajador_novedades")
    .select("id, tipo, fecha_inicio, fecha_fin, motivo")
    .eq("trabajador_id", id)
    .order("fecha_inicio", { ascending: false });

  const { data: aulas } = await supabase
    .from("trabajador_aulas")
    .select("id, aula_id, rol_en_aula, vigente_desde, vigente_hasta, aula:aulas!inner(nombre)")
    .eq("trabajador_id", id)
    .order("vigente_desde", { ascending: false });

  return {
    id: t.id,
    nombre: t.nombre,
    apellido: t.apellido,
    cedula: t.cedula,
    telefono: t.telefono,
    direccion: t.direccion,
    cargo_id: t.cargo_id,
    cargo_nombre: cargo?.nombre ?? "",
    fecha_ingreso: t.fecha_ingreso,
    fecha_egreso: t.fecha_egreso,
    tipo_contrato: t.tipo_contrato,
    salario_base_mensual: Number(t.salario_base_mensual),
    salario_formal_mensual_usd:
      t.salario_formal_mensual_usd === null ? null : Number(t.salario_formal_mensual_usd),
    banco: t.banco,
    numero_cuenta: t.numero_cuenta,
    estado: t.estado,
    tienePerfil: !!perfil,
    novedades: novedades ?? [],
    aulas: (aulas ?? []).map((a) => {
      const aula = Array.isArray(a.aula) ? a.aula[0] : a.aula;
      return {
        id: a.id,
        aula_id: a.aula_id,
        aula_nombre: aula?.nombre ?? "",
        rol_en_aula: a.rol_en_aula,
        vigente_desde: a.vigente_desde,
        vigente_hasta: a.vigente_hasta,
      };
    }),
  };
}
