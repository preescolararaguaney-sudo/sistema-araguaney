"use client";

import { useActionState } from "react";
import { crearAlumnoDesdePago } from "./actions";

const INPUT =
  "rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600";

// Cuando llega un pago de un alumno que no está registrado, se crea aquí con lo mínimo
// (nombre, apellido y aula) y el resto de sus datos se completan después.
export function NuevoAlumnoForm({
  pendienteId,
  nombreInicial,
  apellidoInicial,
  aulas,
}: {
  pendienteId: string;
  nombreInicial: string;
  apellidoInicial: string;
  aulas: { id: string; nombre: string }[];
}) {
  const [state, formAction, pending] = useActionState(crearAlumnoDesdePago, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4">
      <input type="hidden" name="pendiente_id" value={pendienteId} />
      <div>
        <p className="text-sm font-medium text-stone-800">¿Es un alumno que aún no está registrado?</p>
        <p className="text-xs text-stone-500">
          Se crea inscrito en el año actual, con su plan de pagos, y el pago queda ligado a él. Los demás datos
          (representantes, fecha de nacimiento, etc.) se completan después.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-600">Nombre(s)</span>
          <input name="alumno_nombre" defaultValue={nombreInicial} required className={INPUT} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-600">Apellido(s)</span>
          <input name="alumno_apellido" defaultValue={apellidoInicial} required className={INPUT} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-600">Aula</span>
          <select name="aula_id" required defaultValue="" className={INPUT}>
            <option value="" disabled>
              Elige el aula
            </option>
            {aulas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-600">Fecha de nacimiento (opcional)</span>
          <input name="fecha_nacimiento" type="date" className={INPUT} />
        </label>
      </div>
      {state?.error && <p className="text-xs text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Creando..." : "Crear alumno y continuar con el pago"}
      </button>
    </form>
  );
}
