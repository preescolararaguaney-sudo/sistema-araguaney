import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ResumenCobranza = {
  anioEscolar: { id: string; nombre: string } | null;
  alumnosInscritos: number;
  cantidadAulas: number;
};

export async function getResumenCobranza(): Promise<ResumenCobranza> {
  const supabase = await createClient();

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
      cantidadAulas: 0,
    };
  }

  const { count: alumnosInscritos } = await supabase
    .from("matriculas")
    .select("id", { count: "exact", head: true })
    .eq("anio_escolar_id", anioEscolar.id)
    .eq("estado", "inscrito");

  const { count: cantidadAulas } = await supabase
    .from("aulas")
    .select("id", { count: "exact", head: true })
    .eq("activa", true);

  return {
    anioEscolar,
    alumnosInscritos: alumnosInscritos ?? 0,
    cantidadAulas: cantidadAulas ?? 0,
  };
}
