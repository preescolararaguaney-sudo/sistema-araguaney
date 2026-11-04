import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Regla de cobro: algunos conceptos (hoy la mensualidad) valen menos si se
 * pagan en dólares que si se pagan en bolívares ($130 vs $150). La cuota se
 * guarda al precio en dólares; este factor (precio en USD ÷ precio en Bs, p. ej.
 * 130 ÷ 150) convierte entre ambos: un pago en bolívares equivalente a X USD
 * descuenta X × factor de la cuota, y lo que falta por pagar "en bolívares" es
 * saldo ÷ factor. Con factor 1 (sin recargo) todo vale igual en cualquier moneda.
 */
export type FactoresBs = { matricula: number; mensualidad: number };

export const SIN_RECARGO: FactoresBs = { matricula: 1, mensualidad: 1 };

type PrecioFila = {
  concepto: string;
  monto_usd: number | string;
  monto_usd_si_paga_en_bs: number | string | null;
  vigente_desde: string;
};

export async function getFactoresBs(
  supabase: SupabaseClient,
  matriculaId: string,
): Promise<FactoresBs> {
  const { data: matricula } = await supabase
    .from("matriculas")
    .select("anio_escolar_id")
    .eq("id", matriculaId)
    .maybeSingle();
  if (!matricula) return SIN_RECARGO;

  const { data } = await supabase
    .from("precios")
    .select("concepto, monto_usd, monto_usd_si_paga_en_bs, vigente_desde")
    .eq("anio_escolar_id", matricula.anio_escolar_id)
    .order("vigente_desde", { ascending: false });

  // Se usa el precio más reciente de cada concepto, igual que al generar el plan.
  const factorDe = (concepto: string): number => {
    const fila = ((data ?? []) as PrecioFila[]).find((p) => p.concepto === concepto);
    if (!fila || fila.monto_usd_si_paga_en_bs == null) return 1;
    const usd = Number(fila.monto_usd);
    const bs = Number(fila.monto_usd_si_paga_en_bs);
    return usd > 0 && bs > 0 ? usd / bs : 1;
  };

  return { matricula: factorDe("matricula"), mensualidad: factorDe("mensualidad") };
}

// Las partes de agosto son fracciones de la mensualidad, así que usan su misma regla.
export function factorDeCuota(tipo: string, factores: FactoresBs): number {
  return tipo === "matricula" ? factores.matricula : factores.mensualidad;
}
