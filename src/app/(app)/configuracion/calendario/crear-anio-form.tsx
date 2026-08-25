"use client";

import { useActionState } from "react";
import { crearAnioEscolar } from "./actions";

const LAPSOS = [1, 2, 3] as const;

export function CrearAnioForm() {
  const [state, formAction, pending] = useActionState(crearAnioEscolar, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6 rounded-xl border border-stone-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-stone-900">Crear año escolar</h2>
        <p className="mt-1 text-xs text-stone-500">
          Las fechas de los lapsos son un punto de partida: se pueden editar
          después cuando el Ministerio confirme el calendario definitivo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Campo label="Nombre" name="nombre" type="text" placeholder="2026-2027" defaultValue="2026-2027" />
        <Campo label="Inicio del año escolar" name="fecha_inicio" type="date" defaultValue="2026-09-01" />
        <Campo label="Fin del año escolar" name="fecha_fin" type="date" defaultValue="2027-08-31" />
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
          Lapsos
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {LAPSOS.map((n) => (
            <div key={n} className="rounded-lg border border-stone-200 p-3">
              <p className="mb-2 text-sm font-medium text-stone-700">Lapso {n}</p>
              <div className="flex flex-col gap-2">
                <Campo label="Inicio" name={`lapso_${n}_inicio`} type="date" compact />
                <Campo label="Cierre" name={`lapso_${n}_cierre`} type="date" compact />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
          Precios (USD)
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Matrícula" name="precio_matricula" type="number" step="0.01" defaultValue="320" />
          <Campo label="Mensualidad" name="precio_mensualidad" type="number" step="0.01" defaultValue="130" />
        </div>
      </div>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Creando..." : "Crear año escolar"}
      </button>
    </form>
  );
}

function Campo({
  label,
  name,
  type,
  defaultValue,
  placeholder,
  step,
  compact,
}: {
  label: string;
  name: string;
  type: string;
  defaultValue?: string;
  placeholder?: string;
  step?: string;
  compact?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={compact ? "text-xs text-stone-500" : "text-sm font-medium text-stone-700"}>
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        step={step}
        required
        className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
      />
    </label>
  );
}
