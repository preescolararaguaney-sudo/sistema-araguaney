"use client";

import { useActionState, useState } from "react";
import { anularPago } from "./actions";

export function AnularForm({ pagoId }: { pagoId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction, pending] = useActionState(anularPago, undefined);

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="text-xs text-red-600 hover:underline print:hidden"
      >
        Anular este pago
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 p-3 print:hidden">
      <input type="hidden" name="pago_id" value={pagoId} />
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-red-800">
          Motivo de la anulación (obligatorio)
        </span>
        <input
          name="motivo"
          type="text"
          required
          placeholder="Ej: monto registrado en la moneda incorrecta"
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
        />
      </label>
      {state?.error && <p className="text-xs text-red-700">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-800 disabled:opacity-60"
        >
          {pending ? "Anulando..." : "Confirmar anulación"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
