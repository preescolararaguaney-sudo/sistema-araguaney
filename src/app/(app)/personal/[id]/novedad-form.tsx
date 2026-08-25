"use client";

import { useActionState } from "react";
import { agregarNovedad } from "./actions";
import { formatFecha } from "@/lib/format";
import type { NovedadFila } from "@/lib/queries/personal";

const TIPO_LABEL: Record<string, string> = {
  reposo: "Reposo",
  permiso: "Permiso",
  vacaciones: "Vacaciones",
};

export function NovedadForm({ trabajadorId, novedades }: { trabajadorId: string; novedades: NovedadFila[] }) {
  const [state, formAction, pending] = useActionState(agregarNovedad, undefined);

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="grid grid-cols-2 gap-2 rounded-lg border border-stone-200 p-3 sm:grid-cols-4">
        <input type="hidden" name="trabajador_id" value={trabajadorId} />
        <select name="tipo" required className="rounded-md border border-stone-300 px-2 py-1.5 text-sm">
          <option value="reposo">Reposo</option>
          <option value="permiso">Permiso</option>
          <option value="vacaciones">Vacaciones</option>
        </select>
        <input name="fecha_inicio" type="date" required className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
        <input name="fecha_fin" type="date" required className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
        <input name="motivo" type="text" placeholder="Motivo (opcional)" className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
        <button
          type="submit"
          disabled={pending}
          className="col-span-2 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-40 sm:col-span-4 sm:self-start"
        >
          {pending ? "Guardando..." : "+ Registrar novedad"}
        </button>
        {state?.error && <p className="col-span-4 text-xs text-red-700">{state.error}</p>}
      </form>

      <div className="flex flex-col gap-1 text-sm">
        {novedades.map((n) => (
          <div key={n.id} className="flex justify-between border-b border-stone-100 py-1 text-stone-700">
            <span>
              {TIPO_LABEL[n.tipo] ?? n.tipo}
              {n.motivo && ` — ${n.motivo}`}
            </span>
            <span className="text-stone-500">
              {formatFecha(n.fecha_inicio)} – {formatFecha(n.fecha_fin)}
            </span>
          </div>
        ))}
        {novedades.length === 0 && <p className="text-stone-500">Sin novedades registradas.</p>}
      </div>
    </div>
  );
}
