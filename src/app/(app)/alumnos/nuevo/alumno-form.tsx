"use client";

import { useActionState, useState } from "react";
import { crearAlumno } from "./actions";

type Aula = { id: string; nombre: string };

type Autorizado = {
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string;
  parentesco: string;
};

const AUTORIZADO_VACIO: Autorizado = {
  nombre: "",
  apellido: "",
  cedula: "",
  telefono: "",
  parentesco: "",
};

export function AlumnoForm({
  aulas,
  anioEscolarId,
}: {
  aulas: Aula[];
  anioEscolarId: string;
}) {
  const [state, formAction, pending] = useActionState(crearAlumno, undefined);
  const [autorizados, setAutorizados] = useState<Autorizado[]>([]);

  function actualizarAutorizado(i: number, campo: keyof Autorizado, valor: string) {
    setAutorizados((prev) =>
      prev.map((a, idx) => (idx === i ? { ...a, [campo]: valor } : a)),
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="anio_escolar_id" value={anioEscolarId} />
      <input type="hidden" name="autorizados_json" value={JSON.stringify(autorizados)} />

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
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-stone-700">Estado</span>
            <select
              name="estado"
              defaultValue="inscrito"
              required
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            >
              <option value="inscrito">Inscrito (genera el plan de pagos)</option>
              <option value="preinscrito">Preinscrito (sin plan de pagos todavía)</option>
            </select>
          </label>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Textarea label="Datos médicos" name="datos_medicos" />
          <Textarea label="Alergias" name="alergias" />
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-stone-200 bg-white p-5">
        <legend className="px-1 text-sm font-semibold text-stone-900">
          Representante de pago
        </legend>
        <p className="mb-3 text-xs text-stone-500">
          Es quien recibe los recibos y a quien se le factura la mensualidad.
          Si es el mismo padre o madre, repite sus datos aquí también.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nombre" name="representante_nombre" type="text" />
          <Campo label="Apellido" name="representante_apellido" type="text" />
          <Campo label="Cédula" name="representante_cedula" type="text" placeholder="V-12345678" />
          <Campo label="Teléfono" name="representante_telefono" type="text" required={false} />
          <Campo label="Email" name="representante_email" type="email" required={false} />
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-stone-200 bg-white p-5">
        <legend className="px-1 text-sm font-semibold text-stone-900">Padre (opcional)</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nombre" name="padre_nombre" type="text" required={false} />
          <Campo label="Apellido" name="padre_apellido" type="text" required={false} />
          <Campo label="Cédula" name="padre_cedula" type="text" required={false} />
          <Campo label="Teléfono" name="padre_telefono" type="text" required={false} />
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-stone-200 bg-white p-5">
        <legend className="px-1 text-sm font-semibold text-stone-900">Madre (opcional)</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nombre" name="madre_nombre" type="text" required={false} />
          <Campo label="Apellido" name="madre_apellido" type="text" required={false} />
          <Campo label="Cédula" name="madre_cedula" type="text" required={false} />
          <Campo label="Teléfono" name="madre_telefono" type="text" required={false} />
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-stone-200 bg-white p-5">
        <legend className="px-1 text-sm font-semibold text-stone-900">
          Personas autorizadas a retirar
        </legend>
        <div className="flex flex-col gap-3">
          {autorizados.map((a, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-stone-200 p-3 sm:grid-cols-5">
              <input
                placeholder="Nombre"
                value={a.nombre}
                onChange={(e) => actualizarAutorizado(i, "nombre", e.target.value)}
                className="rounded-md border border-stone-300 px-2 py-1 text-sm"
              />
              <input
                placeholder="Apellido"
                value={a.apellido}
                onChange={(e) => actualizarAutorizado(i, "apellido", e.target.value)}
                className="rounded-md border border-stone-300 px-2 py-1 text-sm"
              />
              <input
                placeholder="Cédula"
                value={a.cedula}
                onChange={(e) => actualizarAutorizado(i, "cedula", e.target.value)}
                className="rounded-md border border-stone-300 px-2 py-1 text-sm"
              />
              <input
                placeholder="Teléfono"
                value={a.telefono}
                onChange={(e) => actualizarAutorizado(i, "telefono", e.target.value)}
                className="rounded-md border border-stone-300 px-2 py-1 text-sm"
              />
              <div className="flex gap-2">
                <input
                  placeholder="Parentesco"
                  value={a.parentesco}
                  onChange={(e) => actualizarAutorizado(i, "parentesco", e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setAutorizados((prev) => prev.filter((_, idx) => idx !== i))}
                  className="shrink-0 rounded-md border border-red-300 px-2 text-xs text-red-700 hover:bg-red-50"
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setAutorizados((prev) => [...prev, { ...AUTORIZADO_VACIO }])}
            className="self-start rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100"
          >
            + Agregar autorizado
          </button>
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-stone-200 bg-white p-5">
        <legend className="px-1 text-sm font-semibold text-stone-900">
          Descuento por hermano (opcional)
        </legend>
        <p className="mb-3 text-xs text-stone-500">
          Deja vacío si paga la mensualidad de lista. Si aplica, escribe el
          monto final acordado en USD (no un porcentaje).
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
        {pending ? "Guardando..." : "Guardar alumno"}
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
  required = true,
}: {
  label: string;
  name: string;
  type: string;
  defaultValue?: string;
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
        defaultValue={defaultValue}
        placeholder={placeholder}
        step={step}
        required={required}
        className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
      />
    </label>
  );
}

function Textarea({ label, name }: { label: string; name: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <textarea
        name={name}
        rows={2}
        className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
      />
    </label>
  );
}
