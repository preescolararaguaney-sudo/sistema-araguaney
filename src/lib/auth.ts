import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Rol = "directora" | "administracion" | "docente";

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
