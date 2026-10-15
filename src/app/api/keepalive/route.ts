import { createClient } from "@/lib/supabase/server";

// Lo llama el cron de vercel.json para generar actividad real en la base de
// datos: el plan gratuito de Supabase pausa el proyecto tras 7 días sin
// actividad. Devuelve 500 si la consulta falla, para que el fallo se vea en
// los logs de Vercel en vez de pasar en silencio.
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { error } = await supabase
    .from("aulas")
    .select("id", { count: "exact", head: true });

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
