import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDeudaPorMes } from "@/lib/queries/deuda";
import { csvResponse } from "@/lib/csv";
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

  const filas = [
    ["Aula", "Alumno", "Mes", "Monto (USD)"],
    ...deuda.map((d) => [
      d.aula_nombre,
      `${d.alumno_nombre} ${d.alumno_apellido}`,
      d.concepto,
      d.monto_usd.toFixed(2),
    ]),
  ];

  return csvResponse(filas, `deuda_por_mes_${hoy}.csv`);
}
