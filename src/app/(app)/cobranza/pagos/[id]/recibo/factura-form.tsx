"use client";

import { useActionState } from "react";
import { guardarFacturaPago } from "./actions";

const INPUT =
  "rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600";

export function FacturaPagoForm({
  pagoId,
  nombre,
  cedula,
  telefono,
  numero,
  control,
}: {
  pagoId: string;
  nombre: string | null;
  cedula: string | null;
  telefono: string | null;
  numero: string | null;
  control: string | null;
}) {
  const [state, formAction, pending] = useActionState(guardarFacturaPago, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 print:hidden">
      <input type="hidden" name="pago_id" value={pagoId} />
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Factura de este pago</p>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-stone-600">Facturar a (nombre o razón social)</span>
        <input name="factura_nombre" defaultValue={nombre ?? ""} className={INPUT} />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-600">Cédula / RIF</span>
          <input name="factura_cedula" defaultValue={cedula ?? ""} placeholder="V-12345678" className={INPUT} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-600">Teléfono</span>
          <input name="factura_telefono" defaultValue={telefono ?? ""} className={INPUT} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-600">N.º de factura</span>
          <input name="factura_numero" defaultValue={numero ?? ""} className={INPUT} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-600">N.º de control</span>
          <input name="factura_control" defaultValue={control ?? ""} className={INPUT} />
        </label>
      </div>
      {state?.error && <p className="text-xs text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar datos de factura"}
      </button>
    </form>
  );
}
