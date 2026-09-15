"use client";

import { useActionState, useState } from "react";
import { aprobarSolicitud, rechazarSolicitud } from "./actions";

type Aula = { id: string; nombre: string };

export function AprobarForm({
  solicitudId,
  anioEscolarId,
  aulas,
}: {
  solicitudId: string;
  anioEscolarId: string;
  aulas: Aula[];
}) {
  const [state, formAction, pending] = useActionState(aprobarSolicitud, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <input type="hidden" name="solicitud_id" value={solicitudId} />
      <h2 className="text-sm font-semibold text-emerald-900">Aprobar e inscribir</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-600">Año escolar</span>
          <input type="hidden" name="anio_escolar_id" value={anioEscolarId} />
          <input
            disabled
            value={anioEscolarId ? "Año escolar activo" : "No hay año escolar activo"}
            className="rounded-md border border-stone-300 bg-stone-100 px-3 py-1.5 text-sm text-stone-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-600">Aula</span>
          <select
            name="aula_id"
            required
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          >
            <option value="">Selecciona un aula</option>
            {aulas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-600">Estado inicial</span>
          <select name="estado" defaultValue="inscrito" required className="rounded-md border border-stone-300 px-3 py-1.5 text-sm">
            <option value="inscrito">Inscrito (genera el plan de pagos)</option>
            <option value="preinscrito">Preinscrito (sin plan de pagos todavía)</option>
          </select>
        </label>
      </div>

      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || !anioEscolarId}
        className="self-start rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Creando alumno..." : "Aprobar y crear alumno"}
      </button>
    </form>
  );
}

export function RechazarForm({ solicitudId }: { solicitudId: string }) {
  const [state, formAction, pending] = useActionState(rechazarSolicitud, undefined);
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
