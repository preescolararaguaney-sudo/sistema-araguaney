"use client";

import { useActionState, useState } from "react";
import { actualizarComprobantePublico } from "./actions";

export function ComprobanteFormPublico({
  pagoId,
  comprobanteUrl,
}: {
  pagoId: string;
  comprobanteUrl: string | null;
}) {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction, pending] = useActionState(actualizarComprobantePublico, undefined);

  return (
    <div className="mt-4 flex flex-col gap-2 print:hidden">
      {comprobanteUrl && (
        <a href={comprobanteUrl} target="_blank" rel="noreferrer" className="text-xs text-emerald-700 hover:underline">
          Ver comprobante adjunto
        </a>
      )}

      {!abierto ? (
        <button
          onClick={() => setAbierto(true)}
          className="self-start text-xs text-stone-500 hover:underline"
        >
          {comprobanteUrl ? "Reemplazar comprobante" : "Adjuntar comprobante"}
        </button>
      ) : (
        <form action={formAction} className="flex flex-col gap-2 rounded-md border border-stone-200 bg-stone-50 p-3">
          <input type="hidden" name="pago_id" value={pagoId} />
          <input
            name="comprobante_foto"
            type="file"
            accept="image/*,.pdf"
            capture="environment"
            required
            className="text-xs"
          />
          {state?.error && <p className="text-xs text-red-700">{state.error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {pending ? "Subiendo..." : "Guardar"}
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
      )}
    </div>
  );
}
