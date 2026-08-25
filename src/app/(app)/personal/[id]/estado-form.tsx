"use client";

import { useActionState } from "react";
import { cambiarEstadoTrabajador } from "./actions";

const OPCIONES = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
  { value: "reposo", label: "Reposo" },
  { value: "vacaciones", label: "Vacaciones" },
  { value: "permiso", label: "Permiso" },
];

export function EstadoForm({ trabajadorId, estadoActual }: { trabajadorId: string; estadoActual: string }) {
  const [state, formAction, pending] = useActionState(cambiarEstadoTrabajador, undefined);

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="trabajador_id" value={trabajadorId} />
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-stone-500">Estado</span>
        <select
          name="nuevo_estado"
          defaultValue={estadoActual}
          className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
        >
          {OPCIONES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-stone-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-900 disabled:opacity-40"
      >
        {pending ? "Guardando..." : "Guardar"}
      </button>
      {state?.error && <p className="text-xs text-red-700">{state.error}</p>}
    </form>
  );
}
