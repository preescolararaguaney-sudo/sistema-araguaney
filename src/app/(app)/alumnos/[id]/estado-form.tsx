"use client";

import { useActionState, useState } from "react";
import { cambiarEstadoMatricula } from "./actions";

const OPCIONES: { value: string; label: string }[] = [
  { value: "preinscrito", label: "Preinscrito" },
  { value: "inscrito", label: "Inscrito" },
  { value: "retirado", label: "Retirado" },
  { value: "egresado", label: "Egresado" },
];

export function EstadoForm({
  matriculaId,
  alumnoId,
  estadoActual,
}: {
  matriculaId: string;
  alumnoId: string;
  estadoActual: string;
}) {
  const [state, formAction, pending] = useActionState(cambiarEstadoMatricula, undefined);
  const [nuevoEstado, setNuevoEstado] = useState(estadoActual);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border border-stone-200 p-3">
      <input type="hidden" name="matricula_id" value={matriculaId} />
      <input type="hidden" name="alumno_id" value={alumnoId} />

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-stone-500">Cambiar estado de matrícula</span>
        <select
          name="nuevo_estado"
          value={nuevoEstado}
          onChange={(e) => setNuevoEstado(e.target.value)}
          className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
        >
          {OPCIONES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {nuevoEstado === "retirado" && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-500">Motivo del retiro (obligatorio)</span>
          <input
            name="motivo"
            type="text"
            required
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          />
        </label>
      )}

      {state?.error && <p className="text-xs text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || nuevoEstado === estadoActual}
        className="self-start rounded-md bg-stone-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-900 disabled:opacity-40"
      >
        {pending ? "Guardando..." : "Guardar estado"}
      </button>
    </form>
  );
}
