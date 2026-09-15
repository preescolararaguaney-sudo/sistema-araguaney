"use client";

import { useActionState, useState } from "react";
import { crearSolicitud } from "./actions";

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

type AlumnoExistente = {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  telefono_contacto_rapido: string | null;
};

export function InscripcionForm({
  anioEscolarId,
  alumnoExistente,
}: {
  anioEscolarId: string;
  alumnoExistente?: AlumnoExistente | null;
}) {
  const [state, formAction, pending] = useActionState(crearSolicitud, undefined);
  const [autorizados, setAutorizados] = useState<Autorizado[]>([]);

  function actualizarAutorizado(i: number, campo: keyof Autorizado, valor: string) {
    setAutorizados((prev) => prev.map((a, idx) => (idx === i ? { ...a, [campo]: valor } : a)));
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="anio_escolar_id" value={anioEscolarId} />
      <input type="hidden" name="autorizados_json" value={JSON.stringify(autorizados)} />
      {alumnoExistente && (
        <input type="hidden" name="alumno_existente_id" value={alumnoExistente.id} />
      )}

      <Fieldset
        titulo="Datos del alumno"
        descripcion={alumnoExistente ? "Ya tenemos estos datos; corrígelos si hace falta." : undefined}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo
            label="Primer nombre y segundo nombre"
            name="alumno_nombre"
            defaultValue={alumnoExistente?.nombre}
          />
          <Campo
            label="Primer apellido y segundo apellido"
            name="alumno_apellido"
            defaultValue={alumnoExistente?.apellido}
          />
          <Campo
            label="Fecha de nacimiento"
            name="alumno_fecha_nacimiento"
            type="date"
            required={false}
            defaultValue={alumnoExistente?.fecha_nacimiento ?? undefined}
          />
          <Campo
            label="Teléfono de contacto rápido prioritario"
            name="telefono_contacto_rapido"
            defaultValue={alumnoExistente?.telefono_contacto_rapido ?? undefined}
          />
        </div>
      </Fieldset>

      <DatosPadreMadre prefix="madre" titulo="Datos de la madre" />
      <DatosPadreMadre prefix="padre" titulo="Datos del padre" />

      <Fieldset
        titulo="Personas autorizadas a retirar al niño(a)"
        descripcion="Solo estas personas podrán retirarlo del plantel."
      >
        <div className="flex flex-col gap-3">
          {autorizados.map((a, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-stone-200 p-3 sm:grid-cols-6">
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
            + Agregar persona autorizada
          </button>
        </div>
      </Fieldset>

      <Fieldset titulo="Salud">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Textarea label="Datos médicos relevantes" name="datos_medicos" />
          <Textarea label="Alergias" name="alergias" />
        </div>
        <p className="mt-4 mb-2 text-xs text-stone-500">
          Autorización para suministrar en caso de fiebre o malestar general:
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Medicamento autorizado" name="medicamento_autorizado" required={false} />
          <Campo label="Dosis" name="dosis_medicamento_autorizado" required={false} />
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
        {pending ? "Enviando..." : alumnoExistente ? "Enviar datos" : "Enviar solicitud de inscripción"}
      </button>
    </form>
  );
}

function DatosPadreMadre({ prefix, titulo }: { prefix: "madre" | "padre"; titulo: string }) {
  return (
    <Fieldset titulo={titulo} descripcion="Deja en blanco si no aplica.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Nombre" name={`${prefix}_nombre`} required={false} />
        <Campo label="Apellido" name={`${prefix}_apellido`} required={false} />
        <Campo label="Cédula de identidad" name={`${prefix}_cedula`} placeholder="V-12345678" required={false} />
        <Campo label="Teléfono celular" name={`${prefix}_telefono_celular`} required={false} />
        <Campo label="Sitio de empleo" name={`${prefix}_empresa`} required={false} />
      </div>
    </Fieldset>
  );
}

function Fieldset({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-xl border border-stone-200 bg-white p-5">
      <legend className="px-1 text-sm font-semibold text-stone-900">{titulo}</legend>
      {descripcion && <p className="mb-3 text-xs text-stone-500">{descripcion}</p>}
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
  defaultValue,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
      />
    </label>
  );
}

function Textarea({
  label,
  name,
  className,
}: {
  label: string;
  name: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <textarea
        name={name}
        rows={2}
        className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
      />
    </label>
  );
}
