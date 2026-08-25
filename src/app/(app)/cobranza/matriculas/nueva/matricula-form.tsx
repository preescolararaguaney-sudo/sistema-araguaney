"use client";

import { useActionState } from "react";
import { crearMatriculaBasica } from "./actions";

type Aula = { id: string; nombre: string };

export function MatriculaForm({
  aulas,
  anioEscolarId,
}: {
  aulas: Aula[];
  anioEscolarId: string;
}) {
  const [state, formAction, pending] = useActionState(crearMatriculaBasica, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="anio_escolar_id" value={anioEscolarId} />

      <fieldset className="rounded-xl border border-stone-200 bg-white p-5">
        <legend className="px-1 text-sm font-semibold text-stone-900">Alumno</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nombre" name="alumno_nombre" type="text" />
          <Campo label="Apellido" name="alumno_apellido" type="text" />
          <Campo label="Fecha de nacimiento" name="fecha_nacimiento" type="date" />
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-stone-700">Aula</span>
            <select
              name="aula_id"
              required
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            >
              <option value="">Selecciona un aula</option>
              {aulas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-stone-200 bg-white p-5">
        <legend className="px-1 text-sm font-semibold text-stone-900">
          Representante de pago
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nombre" name="representante_nombre" type="text" />
          <Campo label="Apellido" name="representante_apellido" type="text" />
          <Campo label="Cédula" name="representante_cedula" type="text" placeholder="V-12345678" />
          <Campo label="Teléfono" name="representante_telefono" type="text" required={false} />
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-stone-200 bg-white p-5">
        <legend className="px-1 text-sm font-semibold text-stone-900">
          Descuento por hermano (opcional)
        </legend>
        <p className="mb-3 text-xs text-stone-500">
          Deja vacío si paga la mensualidad de lista. Si aplica un monto
          pactado, escribe el monto final acordado en USD (no un porcentaje).
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Mensualidad pactada (USD)" name="monto_pactado" type="number" step="0.01" required={false} />
          <Campo label="Motivo" name="motivo_descuento" type="text" placeholder="hermano" required={false} />
        </div>
      </fieldset>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Matriculando..." : "Matricular e iniciar plan de pagos"}
      </button>
    </form>
  );
}

function Campo({
  label,
  name,
  type,
  placeholder,
  step,
  required = true,
}: {
  label: string;
  name: string;
  type: string;
  placeholder?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        step={step}
        required={required}
        className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
      />
    </label>
  );
}
