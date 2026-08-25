import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hoyCaracas } from "@/lib/format";

export type ResumenCobranza = {
  anioEscolar: { id: string; nombre: string } | null;
  alumnosInscritos: number;
  cobradoMesUsd: number;
  cobradoMesBs: number;
  pendienteUsd: number;
  morosos: number;
};

export async function getResumenCobranza(): Promise<ResumenCobranza> {
  const supabase = await createClient();
  const hoy = hoyCaracas();
  const inicioMes = `${hoy.slice(0, 7)}-01`;

  const { data: anioEscolar } = await supabase
    .from("anios_escolares")
    .select("id, nombre")
    .eq("activo", true)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!anioEscolar) {
    return {
      anioEscolar: null,
      alumnosInscritos: 0,
      cobradoMesUsd: 0,
      cobradoMesBs: 0,
      pendienteUsd: 0,
      morosos: 0,
    };
  }

  const { count: alumnosInscritos } = await supabase
    .from("matriculas")
    .select("id", { count: "exact", head: true })
    .eq("anio_escolar_id", anioEscolar.id)
    .eq("estado", "inscrito");

  const { data: pagosDelMes } = await supabase
    .from("pagos")
    .select("monto_usd_total, monto_bs_total, matricula:matriculas!inner(anio_escolar_id)")
    .eq("matricula.anio_escolar_id", anioEscolar.id)
    .eq("anulado", false)
    .gte("fecha_pago", inicioMes)
    .lte("fecha_pago", hoy);

  const cobradoMesUsd = (pagosDelMes ?? []).reduce(
    (acc, p) => acc + Number(p.monto_usd_total),
    0,
  );
  const cobradoMesBs = (pagosDelMes ?? []).reduce(
    (acc, p) => acc + Number(p.monto_bs_total),
    0,
  );

  const { data: cuotasAbiertas } = await supabase
    .from("plan_pago_items")
    .select(
      "monto_usd, monto_usd_pagado, fecha_vencimiento, matricula_id, matricula:matriculas!inner(anio_escolar_id)",
    )
    .eq("matricula.anio_escolar_id", anioEscolar.id)
    .neq("estado", "pagado");

  const pendienteUsd = (cuotasAbiertas ?? []).reduce(
    (acc, c) => acc + (Number(c.monto_usd) - Number(c.monto_usd_pagado)),
    0,
  );

  const morosos = new Set(
    (cuotasAbiertas ?? [])
      .filter((c) => c.fecha_vencimiento < hoy)
      .map((c) => c.matricula_id),
  ).size;

  return {
    anioEscolar,
    alumnosInscritos: alumnosInscritos ?? 0,
    cobradoMesUsd,
    cobradoMesBs,
    pendienteUsd,
    morosos,
  };
}
