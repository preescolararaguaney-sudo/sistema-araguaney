"use client";

import { useActionState } from "react";
import { actualizarLapso } from "./actions";

export function LapsoForm({
  id,
  numero,
  fechaInicio,
  fechaCierre,
}: {
  id: string;
  numero: number;
  fechaInicio: string;
  fechaCierre: string;
}) {
  const [state, formAction, pending] = useActionState(actualizarLapso, undefined);

  return (
    <form action={formAction} className="rounded-lg border border-stone-200 p-3">
      <input type="hidden" name="id" value={id} />
      <p className="mb-2 text-sm font-medium text-stone-700">Lapso {numero}</p>
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Inicio</span>
          <input
            name="fecha_inicio"
            type="date"
            defaultValue={fechaInicio}
            required
            className="rounded-md border border-stone-300 px-2 py-1 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Cierre (vence la mensualidad de agosto correspondiente)</span>
          <input
            name="fecha_cierre"
            type="date"
            defaultValue={fechaCierre}
            required
            className="rounded-md border border-stone-300 px-2 py-1 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </label>
      </div>

      {state?.error && <p className="mt-2 text-xs text-red-700">{state.error}</p>}
      {state?.ok && <p className="mt-2 text-xs text-emerald-700">Guardado.</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md border border-stone-300 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
