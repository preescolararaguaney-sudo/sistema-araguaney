"use client";

import { useActionState, useState } from "react";
import { aprobarSolicitudPersonal, rechazarSolicitudPersonal } from "./actions";

type Cargo = { id: string; nombre: string };

const TIPOS_CONTRATO = [
  { value: "indefinido", label: "Indefinido" },
  { value: "determinado", label: "A tiempo determinado" },
  { value: "pasantia", label: "Pasantía" },
];

export function AprobarPersonalForm({
  solicitudId,
  cargos,
  fechaIngresoSugerida,
}: {
  solicitudId: string;
  cargos: Cargo[];
  fechaIngresoSugerida: string | null;
}) {
  const [state, formAction, pending] = useActionState(aprobarSolicitudPersonal, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <input type="hidden" name="solicitud_id" value={solicitudId} />
      <h2 className="text-sm font-semibold text-emerald-900">Aprobar y crear trabajador</h2>
      <p className="text-sm text-stone-600">
        Completa el cargo y la compensación — esto no lo llena el aspirante.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-600">Cargo</span>
          <select name="cargo_id" required className="rounded-md border border-stone-300 px-3 py-1.5 text-sm">
            <option value="">Selecciona un cargo</option>
            {cargos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-600">Fecha de ingreso</span>
          <input
            name="fecha_ingreso"
            type="date"
            required
            defaultValue={fechaIngresoSugerida ?? ""}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-600">Tipo de contrato</span>
          <select name="tipo_contrato" defaultValue="indefinido" className="rounded-md border border-stone-300 px-3 py-1.5 text-sm">
            {TIPOS_CONTRATO.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-600">Salario base mensual (USD)</span>
          <input
            name="salario_base_mensual"
            type="number"
            step="0.01"
            required
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-600">Salario formal mensual (Bs, opcional)</span>
          <input
            name="salario_formal_mensual_bs"
            type="number"
            step="0.01"
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-600">Banco (opcional)</span>
          <input name="banco" type="text" className="rounded-md border border-stone-300 px-3 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-600">Número de cuenta (opcional)</span>
          <input name="numero_cuenta" type="text" className="rounded-md border border-stone-300 px-3 py-1.5 text-sm" />
        </label>
      </div>

      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Creando..." : "Aprobar y crear trabajador"}
      </button>
    </form>
  );
}

export function RechazarPersonalForm({ solicitudId }: { solicitudId: string }) {
  const [state, formAction, pending] = useActionState(rechazarSolicitudPersonal, undefined);
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="self-start rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        Rechazar solicitud
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
      <input type="hidden" name="solicitud_id" value={solicitudId} />
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-stone-600">Motivo del rechazo</span>
        <input
          name="motivo_rechazo"
          type="text"
          required
          className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
        />
      </label>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
        >
          {pending ? "Rechazando..." : "Confirmar rechazo"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
