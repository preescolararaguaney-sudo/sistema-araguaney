import "server-only";
import { createClient } from "@/lib/supabase/server";

export type CierreMetodo = {
  metodo: string;
  cantidad: number;
  total_usd: number;
  total_bs: number;
};

export type CierreMes = {
  mes: string; // "YYYY-MM"
  porMetodo: CierreMetodo[];
  totalUsd: number;
  totalBs: number;
  cantidadPagos: number;
};

/** `mes` en formato "YYYY-MM". Se asume calendario, no año escolar. */
export async function getCierreMes(mes: string): Promise<CierreMes> {
  const supabase = await createClient();
  const inicio = `${mes}-01`;
  const [year, month] = mes.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const fin = `${mes}-${String(ultimoDia).padStart(2, "0")}`;

  const { data: pagos } = await supabase
    .from("pagos")
    .select("metodo, monto_usd_total, monto_bs_total")
    .eq("anulado", false)
    .gte("fecha_pago", inicio)
    .lte("fecha_pago", fin);

  const porMetodoMap = new Map<string, CierreMetodo>();
  for (const p of pagos ?? []) {
    const existente = porMetodoMap.get(p.metodo);
    const usd = Number(p.monto_usd_total);
    const bs = Number(p.monto_bs_total);
    if (existente) {
      existente.cantidad += 1;
      existente.total_usd += usd;
      existente.total_bs += bs;
    } else {
      porMetodoMap.set(p.metodo, { metodo: p.metodo, cantidad: 1, total_usd: usd, total_bs: bs });
    }
  }

  const porMetodo = Array.from(porMetodoMap.values()).sort((a, b) => b.total_usd - a.total_usd);

  return {
    mes,
    porMetodo,
    totalUsd: porMetodo.reduce((acc, m) => acc + m.total_usd, 0),
    totalBs: porMetodo.reduce((acc, m) => acc + m.total_bs, 0),
    cantidadPagos: pagos?.length ?? 0,
  };
}
