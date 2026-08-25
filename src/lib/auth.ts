import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Solo directivos y el gerente entran al sistema (las docentes no tienen
// acceso). "directora" = acceso total; "administracion" = cobranza, alumnos,
// personal y nómina, sin gestión de usuarios — se asigna tanto a la
// Directora del plantel como al Asistente Administrativo.
export type Rol = "directora" | "administracion";

export type Perfil = {
  id: string;
  nombre_completo: string;
  rol: Rol;
  activo: boolean;
};

// cache() evita volver a consultar `perfiles` si varios componentes del
// mismo render piden el perfil del usuario actual.
export const getPerfil = cache(async (): Promise<Perfil | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, rol, activo")
    .eq("id", user.id)
    .single();

  return (data as Perfil | null) ?? null;
});

/** Redirige a /sin-acceso si el usuario no tiene uno de los roles permitidos. */
export async function requireRol(rolesPermitidos: Rol[]): Promise<Perfil> {
  const perfil = await getPerfil();
  if (!perfil || !perfil.activo || !rolesPermitidos.includes(perfil.rol)) {
    redirect("/sin-acceso");
  }
  return perfil;
}
