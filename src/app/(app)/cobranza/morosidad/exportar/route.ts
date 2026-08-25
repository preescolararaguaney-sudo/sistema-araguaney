import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMorosos } from "@/lib/queries/morosidad";
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

  const morosos = await getMorosos(anioEscolar.id);

  const filas = [
    ["Alumno", "Aula", "Representante", "Teléfono", "Cuotas vencidas", "Total vencido (USD)"],
    ...morosos.map((m) => [
      `${m.alumno_nombre} ${m.alumno_apellido}`,
      m.aula_nombre,
      m.representante_nombre,
      m.representante_telefono ?? "",
      m.cuotas_vencidas,
      m.total_vencido_usd.toFixed(2),
    ]),
  ];

  return csvResponse(filas, `morosidad_${hoyCaracas()}.csv`);
}
