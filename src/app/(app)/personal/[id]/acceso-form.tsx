"use client";

import { useActionState } from "react";
import { crearAccesoTrabajador } from "./actions";

export function AccesoForm({
  trabajadorId,
  nombreSugerido,
}: {
  trabajadorId: string;
  nombreSugerido: string;
}) {
  const [state, formAction, pending] = useActionState(crearAccesoTrabajador, undefined);

  if (state?.ok) {
    return (
      <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        Acceso creado. Comparte el correo y la contraseña con el trabajador.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-stone-200 p-3">
      <input type="hidden" name="trabajador_id" value={trabajadorId} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Nombre completo</span>
          <input
            name="nombre_completo"
            type="text"
            defaultValue={nombreSugerido}
            required
            className="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Rol</span>
          <select name="rol" required className="rounded-md border border-stone-300 px-2 py-1.5 text-sm">
            <option value="administracion">Administración</option>
            <option value="directora">Directora</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Correo</span>
          <input name="email" type="email" required className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Contraseña temporal (mín. 8 caracteres)</span>
          <input
            name="password"
            type="text"
            required
            minLength={8}
            className="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      {state?.error && <p className="text-xs text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Creando..." : "Crear acceso"}
      </button>
    </form>
  );
}
