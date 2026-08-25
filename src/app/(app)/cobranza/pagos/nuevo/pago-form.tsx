"use client";

import { useActionState } from "react";
import { registrarPago } from "./actions";

const METODOS = [
  { value: "transferencia_bs", label: "Transferencia en Bs" },
  { value: "pago_movil", label: "Pago móvil" },
  { value: "efectivo_bs", label: "Efectivo en Bs" },
  { value: "efectivo_usd", label: "Efectivo en USD" },
  { value: "zelle", label: "Zelle" },
  { value: "otro", label: "Otro" },
];

export function PagoForm({
  matriculaId,
  fechaHoy,
  tasaHoy,
  totalPendiente,
}: {
  matriculaId: string;
  fechaHoy: string;
  tasaHoy: number | null;
  totalPendiente: number;
}) {
  const [state, formAction, pending] = useActionState(registrarPago, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-5">
      <input type="hidden" name="matricula_id" value={matriculaId} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Fecha de pago" name="fecha_pago" type="date" defaultValue={fechaHoy} />
        <Campo
          label="Tasa BCV del día"
          name="tasa_bcv"
          type="number"
          step="0.0001"
          defaultValue={tasaHoy ? String(tasaHoy) : undefined}
        />
        <Campo
          label={`Monto a pagar (USD) — pendiente: ${totalPendiente.toFixed(2)}`}
          name="monto_usd_total"
          type="number"
          step="0.01"
        />
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-stone-700">Método de pago</span>
          <select
            name="metodo"
            required
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          >
            {METODOS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <Campo label="Referencia" name="referencia" type="text" required={false} />
        <Campo
          label="Comprobante (enlace, opcional)"
          name="comprobante_url"
          type="text"
          required={false}
        />
      </div>

      <p className="text-xs text-stone-500">
        El pago se aplica automáticamente a las cuotas más antiguas pendientes
        primero (abono). Si el monto no cubre una cuota completa, queda en
        estado &ldquo;parcial&rdquo;.
      </p>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Registrando..." : "Registrar pago"}
      </button>
    </form>
  );
}

function Campo({
  label,
  name,
  type,
  defaultValue,
  step,
  required = true,
}: {
  label: string;
  name: string;
  type: string;
  defaultValue?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        step={step}
        required={required}
        className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
      />
    </label>
  );
}
