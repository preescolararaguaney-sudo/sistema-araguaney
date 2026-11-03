"use client";

import { useActionState } from "react";
import { rechazarPendiente } from "./actions";

export function RechazarForm({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(rechazarPendiente, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-md border border-stone-200 bg-stone-50 p-3">
      <input type="hidden" name="pendiente_id" value={id} />
      <span className="text-xs font-medium text-stone-600">¿No corresponde registrarlo? Recházalo con un motivo.</span>
      <div className="flex gap-2">
        <input
          name="motivo"
          required
          placeholder="Motivo (ej. no es un pago, está repetido)"
          className="flex-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-red-600"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          {pending ? "Rechazando..." : "Rechazar"}
        </button>
      </div>
      {state?.error && <p className="text-xs text-red-700">{state.error}</p>}
    </form>
  );
}
