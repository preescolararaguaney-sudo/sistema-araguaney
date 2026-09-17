import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getRosterAlumnos } from "@/lib/queries/roster-alumnos";
import { csvResponse } from "@/lib/csv";
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

  let numeroEnAula = 0;
  let aulaAnterior = "";
  const filas = [
    ["Aula", "N°", "Apellido", "Nombre", "Fecha de nacimiento"],
    ...roster.map((a) => {
      numeroEnAula = a.aula_nombre === aulaAnterior ? numeroEnAula + 1 : 1;
      aulaAnterior = a.aula_nombre;
      return [
        a.aula_nombre,
        numeroEnAula,
        a.apellido,
        a.nombre,
        a.fecha_nacimiento ? formatFecha(a.fecha_nacimiento) : "",
      ];
    }),
  ];

  return csvResponse(filas, `nomina_alumnos_${hoyCaracas()}.csv`);
}
