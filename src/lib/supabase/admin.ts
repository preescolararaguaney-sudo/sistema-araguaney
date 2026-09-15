import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con la llave `service_role`: salta TODAS las políticas RLS.
// Úsalo únicamente dentro de Server Actions ya protegidas con
// requireRol(["directora"]), o desde una función explícitamente acotada a
// columnas concretas para una ruta pública (ver
// src/lib/queries/alumno-publico.ts) — nunca lo importes en un componente
// cliente, ni hagas un `select("*")` con él desde código que un usuario sin
// login pueda alcanzar.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
