"use client";

import { useActionState } from "react";
import { crearSolicitudPersonal } from "./actions";

export function PersonalForm() {
  const [state, formAction, pending] = useActionState(crearSolicitudPersonal, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Fieldset titulo="Datos personales">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nombres" name="nombre" />
          <Campo label="Apellidos" name="apellido" />
          <Campo label="Cédula de identidad" name="cedula" placeholder="V-12345678" />
          <Campo label="País de nacimiento" name="pais_nacimiento" required={false} />
          <Campo label="Fecha de nacimiento" name="fecha_nacimiento" type="date" required={false} />
          <Campo label="Correo electrónico" name="email" type="email" required={false} />
          <Campo label="Número de teléfono" name="telefono" required={false} />
          <Campo label="Fecha de ingreso al trabajo" name="fecha_ingreso" type="date" required={false} />
        </div>
      </Fieldset>

      <Fieldset titulo="Domicilio">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Estado" name="domicilio_estado" required={false} />
          <Campo label="Municipio" name="domicilio_municipio" required={false} />
          <Campo label="Parroquia" name="domicilio_parroquia" required={false} />
          <Campo label="Dirección exacta" name="direccion" required={false} />
        </div>
      </Fieldset>

      <Fieldset titulo="Información académica">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Título obtenido" name="titulo_obtenido" required={false} />
          <Campo label="Institución donde lo obtuvo" name="institucion_titulo" required={false} />
          <Campo label="Fecha en que obtuvo el título" name="fecha_obtencion_titulo" type="date" required={false} />
        </div>
      </Fieldset>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-emerald-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar datos"}
      </button>
    </form>
  );
}

function Fieldset({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-stone-200 bg-white p-5">
      <legend className="px-1 text-sm font-semibold text-stone-900">{titulo}</legend>
      {children}
    </fieldset>
  );
}

function Campo({
  label,
  name,
  type = "text",
  placeholder,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
      />
    </label>
  );
}
