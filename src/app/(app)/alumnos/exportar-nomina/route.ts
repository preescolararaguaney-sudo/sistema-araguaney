import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getRosterAlumnos } from "@/lib/queries/roster-alumnos";
import { buildWorkbookPorAula, xlsxResponse } from "@/lib/xlsx";
import { formatFecha, hoyCaracas } from "@/lib/format";

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

  const roster = await getRosterAlumnos(anioEscolar.id);
  const aulas = Array.from(new Set(roster.map((a) => a.aula_nombre)));

  const hojas = aulas.map((aula) => ({
    nombre: aula,
    columnas: ["N°", "Apellido", "Nombre", "Fecha de nacimiento"],
    filas: roster
      .filter((a) => a.aula_nombre === aula)
      .map((a, i) => [
        i + 1,
        a.apellido,
        a.nombre,
        a.fecha_nacimiento ? formatFecha(a.fecha_nacimiento) : "",
      ]),
  }));

  const buffer = await buildWorkbookPorAula(hojas);
  return xlsxResponse(buffer, `nomina_alumnos_${hoyCaracas()}.xlsx`);
}
