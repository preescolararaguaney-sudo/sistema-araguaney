import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDeudaPorMes } from "@/lib/queries/deuda";
import { buildWorkbookPorAula, xlsxResponse } from "@/lib/xlsx";
import { hoyCaracas } from "@/lib/format";

export async function GET() {
  await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const { data: anioEscolar } = await supabase
    .from("anios_escolares")
    .select("id")
    .eq("activo", true)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!anioEscolar) {
    return new Response("No hay año escolar activo", { status: 400 });
  }

  const hoy = hoyCaracas();
  const deuda = await getDeudaPorMes(anioEscolar.id, hoy);

  const aulas = Array.from(new Set(deuda.map((d) => d.aula_nombre)));
  const hojas = aulas.map((aula) => ({
    nombre: aula,
    columnas: ["Alumno", "Mes", "Monto (USD)"],
    filas: deuda
      .filter((d) => d.aula_nombre === aula)
      .map((d) => [`${d.alumno_nombre} ${d.alumno_apellido}`, d.concepto, d.monto_usd]),
  }));

  const buffer = await buildWorkbookPorAula(hojas);
  return xlsxResponse(buffer, `deuda_por_mes_${hoy}.xlsx`);
}
