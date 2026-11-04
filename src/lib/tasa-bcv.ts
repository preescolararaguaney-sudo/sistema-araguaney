import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const HISTORICO_URL = "https://ve.dolarapi.com/v1/historicos/dolares/oficial";

export type TasaDelDia = {
  tasa: number;
  // Fecha en que el BCV publicó esa tasa: la misma de la consulta, o la del
  // último día hábil anterior si la fecha cae en fin de semana o feriado.
  fechaTasa: string;
  origen: "guardada" | "bcv";
};

/**
 * Tasa oficial del BCV vigente en una fecha (la del día de la transferencia).
 * Regla: se usa la última tasa publicada en o antes de esa fecha, así que un
 * pago hecho un domingo usa la del viernes. Se lee primero lo ya guardado en
 * `tasas_bcv` (incluye tasas puestas a mano) y, si no hay, se consulta el
 * histórico público del BCV (dolarapi.com) y se guarda para la próxima vez.
 */
export async function tasaBcvParaFecha(fecha: string): Promise<TasaDelDia | { error: string }> {
  const admin = createAdminClient();

  const { data: guardada } = await admin
    .from("tasas_bcv")
    .select("tasa")
    .eq("fecha", fecha)
    .maybeSingle();
  if (guardada) return { tasa: Number(guardada.tasa), fechaTasa: fecha, origen: "guardada" };

  let historico: { fecha: string; promedio: number }[];
  try {
    const res = await fetch(HISTORICO_URL, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    historico = await res.json();
  } catch {
    return { error: "No se pudo consultar la tasa del BCV. Escríbela a mano." };
  }

  const vigente = historico
    .filter((h) => h.fecha <= fecha && Number(h.promedio) > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .at(-1);
  if (!vigente) return { error: "No hay una tasa del BCV publicada para esa fecha." };

  const tasa = Number(vigente.promedio);
  await admin
    .from("tasas_bcv")
    .upsert(
      { fecha, tasa, fuente: "BCV (histórico vía dolarapi.com)" },
      { onConflict: "fecha", ignoreDuplicates: true },
    );

  return { tasa, fechaTasa: vigente.fecha, origen: "bcv" };
}
