"use client";

import { useActionState } from "react";
import { dividirPendiente } from "../actions";

export function DividirForm({
  pendienteId,
  matriculaId,
  alumno,
  montoTotal,
}: {
  pendienteId: string;
  matriculaId: string;
  alumno: string;
  montoTotal: number;
}) {
  const [state, formAction, pending] = useActionState(dividirPendiente, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4">
      <input type="hidden" name="pendiente_id" value={pendienteId} />
      <input type="hidden" name="matricula_id" value={matriculaId} />
      <p className="text-sm text-stone-800">
        ¿Cuántos Bs de este pago son de <strong>{alumno}</strong>?
      </p>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-stone-600">Monto en Bs de este alumno</span>
        <input
          name="monto_bs"
          type="number"
          step="0.01"
          min="0.01"
          max={montoTotal}
          defaultValue={Math.round((montoTotal / 2) * 100) / 100}
          required
          className="w-48 rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600"
        />
        <span className="text-xs text-stone-500">
          Se propone la mitad. Lo que quede se mantiene en el pago original.
        </span>
      </label>
      {state?.error && <p className="text-xs text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Dividiendo..." : "Crear el pago de este alumno"}
      </button>
    </form>
  );
}
