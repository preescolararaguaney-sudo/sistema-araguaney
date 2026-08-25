import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Un cliente nuevo por request (Server Components/Actions), nunca se comparte
// entre usuarios: cada uno lee las cookies de su propia sesión.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Se llamó desde un Server Component (no puede escribir cookies);
            // el proxy.ts ya se encarga de refrescar la sesión en cada request.
          }
        },
      },
    },
  );
}
