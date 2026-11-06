import "server-only";
import { createClient } from "@/lib/supabase/server";

export type PagoPendiente = {
  id: string;
  creado_en: string;
  estado: "pendiente" | "aprobado" | "rechazado" | "duplicado";
  nota: string | null;
  enviado_por: string | null;
  comprobante_url: string | null;
  monto_bs: number | null;
  fecha_pago: string | null;
  referencia: string | null;
  banco: string | null;
  metodo: string | null;
  emisor_nombre: string | null;
  emisor_cedula: string | null;
  matricula_id: string | null;
  conceptos_sugeridos: string[];
  factura_nombre: string | null;
  factura_cedula: string | null;
  factura_telefono: string | null;
  factura_direccion: string | null;
  pago_id: string | null;
  motivo_rechazo: string | null;
  factura_numero: string | null;
  factura_control: string | null;
  concepto_libre: string | null;
  lectura: { observaciones?: string | null; descripcion?: string | null } | null;
  alumno_nombre: string | null;
  aula_nombre: string | null;
};

const COLUMNAS = `id, creado_en, estado, nota, enviado_por, comprobante_url, monto_bs, fecha_pago, referencia,
  banco, metodo, emisor_nombre, emisor_cedula, matricula_id, conceptos_sugeridos, factura_nombre,
  factura_cedula, factura_telefono, factura_direccion, pago_id, motivo_rechazo,
  factura_numero, factura_control, concepto_libre, lectura,
  matricula:matriculas(alumno:alumnos(nombre, apellido), aula:aulas(nombre))`;

type FilaCruda = Omit<PagoPendiente, "monto_bs" | "alumno_nombre" | "aula_nombre"> & {
  monto_bs: number | string | null;
  matricula:
    | { alumno: { nombre: string; apellido: string } | { nombre: string; apellido: string }[] | null; aula: { nombre: string } | { nombre: string }[] | null }
    | { alumno: { nombre: string; apellido: string } | { nombre: string; apellido: string }[] | null; aula: { nombre: string } | { nombre: string }[] | null }[]
    | null;
};

const uno = <T,>(x: T | T[] | null | undefined): T | null =>
  Array.isArray(x) ? (x[0] ?? null) : (x ?? null);

function aPendiente(f: FilaCruda): PagoPendiente {
  const { matricula, ...resto } = f;
  const m = uno(matricula);
  const alumno = uno(m?.alumno);
  return {
    ...resto,
    monto_bs: f.monto_bs == null ? null : Number(f.monto_bs),
    alumno_nombre: alumno ? `${alumno.nombre} ${alumno.apellido}`.replace(/\s+/g, " ").trim() : null,
    aula_nombre: uno(m?.aula)?.nombre ?? null,
  };
}

export async function getPagosPendientes(estado: string): Promise<PagoPendiente[]> {
  const supabase = await createClient();
  // origen "nota" = texto guardado a la espera de su capture; no es un pago.
  let consulta = supabase
    .from("pagos_pendientes")
    .select(COLUMNAS)
    .neq("origen", "nota")
    .order("creado_en", { ascending: false })
    .limit(200);
  if (estado) consulta = consulta.eq("estado", estado);
  const { data } = await consulta;
  return ((data ?? []) as unknown as FilaCruda[]).map(aPendiente);
}

export async function getPagoPendiente(id: string): Promise<PagoPendiente | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("pagos_pendientes").select(COLUMNAS).eq("id", id).maybeSingle();
  return data ? aPendiente(data as unknown as FilaCruda) : null;
}

export async function contarPagosPendientes(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("pagos_pendientes")
    .select("id", { count: "exact", head: true })
    .neq("origen", "nota")
    .eq("estado", "pendiente");
  return count ?? 0;
}

// Conceptos a los que se aplicó un pago ya aprobado (para la ficha de factura).
export async function getConceptosDePago(pagoId: string): Promise<{ descripcion: string; monto_usd: number }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pago_aplicaciones")
    .select("monto_usd_aplicado, plan_item:plan_pago_items(descripcion)")
    .eq("pago_id", pagoId);
  return (data ?? []).map((a) => {
    const item = uno(a.plan_item as { descripcion: string } | { descripcion: string }[] | null);
    return { descripcion: item?.descripcion ?? "", monto_usd: Number(a.monto_usd_aplicado) };
  });
}

// Descripciones de las cuotas sugeridas para un pago que aún no se aprobó (ficha de factura).
export async function getDescripcionesConceptos(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("plan_pago_items")
    .select("descripcion, fecha_vencimiento")
    .in("id", ids)
    .order("fecha_vencimiento", { ascending: true });
  return (data ?? []).map((c) => c.descripcion);
}
