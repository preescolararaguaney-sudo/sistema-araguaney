"use client";

import { useActionState } from "react";
import { guardarNumeroFactura } from "./actions";

export function NumeroFacturaForm({
  id,
  numero,
  control,
}: {
  id: string;
  numero: string | null;
  control: string | null;
}) {
  const [state, formAction, pending] = useActionState(guardarNumeroFactura, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-4">
      <input type="hidden" name="pendiente_id" value={id} />
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
        Factura del talonario (llénalo cuando la escribas)
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-600">N.º de factura</span>
          <input
            name="factura_numero"
            defaultValue={numero ?? ""}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-600">N.º de control</span>
          <input
            name="factura_control"
            defaultValue={control ?? ""}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar"}
      </button>
      {state?.error && <p className="text-xs text-red-700">{state.error}</p>}
    </form>
  );
}
