import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDeudaActual } from "@/lib/queries/deuda";
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

  const deuda = await getDeudaActual(anioEscolar.id);

  const filas = [
    ["Aula", "Alumno", "Representante", "Teléfono", "Deuda actual (USD)"],
    ...deuda.map((d) => [
      d.aula_nombre,
      `${d.alumno_nombre} ${d.alumno_apellido}`,
      d.representante_nombre,
      d.representante_telefono ?? "",
      d.deuda_actual_usd.toFixed(2),
    ]),
  ];

  return csvResponse(filas, `deuda_actual_${hoyCaracas()}.csv`);
}
