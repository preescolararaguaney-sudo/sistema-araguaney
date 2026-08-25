"use client";

import { useActionState } from "react";
import { crearTrabajador } from "./actions";

type Cargo = { id: string; nombre: string };

const TIPOS_CONTRATO = ["indefinido", "determinado", "pasantia"];

export function TrabajadorForm({ cargos }: { cargos: Cargo[] }) {
  const [state, formAction, pending] = useActionState(crearTrabajador, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <fieldset className="rounded-xl border border-stone-200 bg-white p-5">
        <legend className="px-1 text-sm font-semibold text-stone-900">Datos personales</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nombre" name="nombre" type="text" />
          <Campo label="Apellido" name="apellido" type="text" />
          <Campo label="Cédula" name="cedula" type="text" placeholder="V-12345678" />
          <Campo label="Teléfono" name="telefono" type="text" required={false} />
          <Campo label="Dirección" name="direccion" type="text" required={false} />
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-stone-200 bg-white p-5">
        <legend className="px-1 text-sm font-semibold text-stone-900">Cargo y contrato</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-stone-700">Cargo</span>
            <select
              name="cargo_id"
              required
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            >
              <option value="">Selecciona un cargo</option>
              {cargos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-stone-700">Tipo de contrato</span>
            <select
              name="tipo_contrato"
              defaultValue="indefinido"
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            >
              {TIPOS_CONTRATO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <Campo label="Fecha de ingreso" name="fecha_ingreso" type="date" />
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-stone-200 bg-white p-5">
        <legend className="px-1 text-sm font-semibold text-stone-900">Compensación (nómina)</legend>
        <p className="mb-3 text-xs text-stone-500">
          El sueldo mensual objetivo es lo que realmente recibe el
          trabajador en total. El salario formal es el monto (mucho menor)
          que se declara legalmente y sobre el que se calculan IVSS/RPE/FAOV
          — el resto se paga como bono sin retención.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Sueldo mensual objetivo (USD)" name="salario_base_mensual" type="number" step="0.01" />
          <Campo
            label="Salario formal mensual para nómina legal (USD, opcional)"
            name="salario_formal_mensual_usd"
            type="number"
            step="0.01"
            required={false}
          />
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-stone-200 bg-white p-5">
        <legend className="px-1 text-sm font-semibold text-stone-900">Datos bancarios (opcional)</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Banco" name="banco" type="text" required={false} />
          <Campo label="Número de cuenta" name="numero_cuenta" type="text" required={false} />
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
        {pending ? "Guardando..." : "Guardar trabajador"}
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
