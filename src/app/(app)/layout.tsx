import { getPerfil } from "@/lib/auth";
import { NAV_ITEMS } from "./nav-items";
import { NavLinks } from "./nav-links";
import { LogoutButton } from "./logout-button";

const ROL_LABEL: Record<string, string> = {
  directora: "Directora",
  administracion: "Administración",
  docente: "Docente",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await getPerfil();

  // El usuario está autenticado en Supabase pero no tiene fila en `perfiles`
  // todavía (caso típico: el primer usuario, antes de que la directora lo
  // registre). Se muestra un aviso en vez de romper la app.
  if (!perfil) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="max-w-md rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <h1 className="text-base font-semibold text-amber-900">
            Tu cuenta no tiene un perfil asignado
          </h1>
          <p className="mt-2 text-sm text-amber-800">
            Ya iniciaste sesión correctamente, pero todavía no existe un
            registro en el sistema con tu rol (directora, administración o
            docente). Pide a la directora que lo cree.
          </p>
        </div>
      </div>
    );
  }

  const items = NAV_ITEMS.filter((item) => item.roles.includes(perfil.rol));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-stone-900">
              Preescolar Araguaney
            </p>
            <p className="text-xs text-stone-500">
              {perfil.nombre_completo} · {ROL_LABEL[perfil.rol]}
            </p>
          </div>
          <LogoutButton />
        </div>
        <div className="mx-auto max-w-6xl px-3">
          <NavLinks items={items} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
