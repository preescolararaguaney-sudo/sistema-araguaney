"use client";

import { useActionState, useState } from "react";
import { anularReciboNomina } from "./actions";

export function AnularReciboForm({ reciboId, periodoId }: { reciboId: string; periodoId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction, pending] = useActionState(anularReciboNomina, undefined);

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="text-xs text-red-600 hover:underline">
        Anular
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-1">
      <input type="hidden" name="recibo_id" value={reciboId} />
      <input type="hidden" name="periodo_id" value={periodoId} />
      <input
        name="motivo"
        type="text"
        placeholder="Motivo"
        required
        className="w-28 rounded-md border border-stone-300 px-1.5 py-1 text-xs"
      />
      <button type="submit" disabled={pending} className="text-xs text-red-700 hover:underline disabled:opacity-40">
        {pending ? "..." : "OK"}
      </button>
      {state?.error && <span className="text-xs text-red-700">{state.error}</span>}
    </form>
  );
}
