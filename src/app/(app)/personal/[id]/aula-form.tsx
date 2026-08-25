"use client";

import { useActionState } from "react";
import { asignarAula, finalizarAsignacionAula } from "./actions";
import { formatFecha } from "@/lib/format";
import type { AulaAsignada } from "@/lib/queries/personal";

type Aula = { id: string; nombre: string };

const ROL_LABEL: Record<string, string> = {
  titular: "Titular",
  auxiliar: "Auxiliar",
  apoyo: "Apoyo",
};

export function AulaForm({
  trabajadorId,
  aulas,
  asignaciones,
}: {
  trabajadorId: string;
  aulas: Aula[];
  asignaciones: AulaAsignada[];
}) {
  const [state, formAction, pending] = useActionState(asignarAula, undefined);

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="grid grid-cols-2 gap-2 rounded-lg border border-stone-200 p-3 sm:grid-cols-3">
        <input type="hidden" name="trabajador_id" value={trabajadorId} />
        <select name="aula_id" required className="rounded-md border border-stone-300 px-2 py-1.5 text-sm">
          <option value="">Selecciona un aula</option>
          {aulas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
        <select name="rol_en_aula" defaultValue="titular" className="rounded-md border border-stone-300 px-2 py-1.5 text-sm">
          <option value="titular">Titular</option>
          <option value="auxiliar">Auxiliar</option>
          <option value="apoyo">Apoyo</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-40"
        >
          {pending ? "Asignando..." : "+ Asignar"}
        </button>
        {state?.error && <p className="col-span-3 text-xs text-red-700">{state.error}</p>}
      </form>

      <div className="flex flex-col gap-1">
        {asignaciones.map((a) => (
          <FilaAsignacion key={a.id} asignacion={a} trabajadorId={trabajadorId} />
        ))}
        {asignaciones.length === 0 && (
          <p className="text-sm text-stone-500">Sin aulas asignadas.</p>
        )}
      </div>
    </div>
  );
}

function FilaAsignacion({
  asignacion,
  trabajadorId,
}: {
  asignacion: AulaAsignada;
  trabajadorId: string;
}) {
  const [, formAction, pending] = useActionState(finalizarAsignacionAula, undefined);
  const activa = !asignacion.vigente_hasta;

  return (
    <div className="flex items-center justify-between border-b border-stone-100 py-1 text-sm">
      <span className="text-stone-700">
        {asignacion.aula_nombre} — {ROL_LABEL[asignacion.rol_en_aula] ?? asignacion.rol_en_aula}
        <span className="ml-2 text-xs text-stone-500">
          desde {formatFecha(asignacion.vigente_desde)}
          {asignacion.vigente_hasta && ` hasta ${formatFecha(asignacion.vigente_hasta)}`}
        </span>
      </span>
      {activa && (
        <form action={formAction}>
          <input type="hidden" name="trabajador_aula_id" value={asignacion.id} />
          <input type="hidden" name="trabajador_id" value={trabajadorId} />
          <button
            type="submit"
            disabled={pending}
            className="text-xs text-red-600 hover:underline disabled:opacity-40"
          >
            Finalizar
          </button>
        </form>
      )}
    </div>
  );
}
