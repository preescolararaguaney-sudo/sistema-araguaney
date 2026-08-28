"use client";

import { useActionState, useState } from "react";
import { actualizarAlumno } from "./actions";
import type { AlumnoEditable, ContactoEditable } from "@/lib/queries/alumno-editar";

type Aula = { id: string; nombre: string };

type NuevoAutorizado = {
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string;
  parentesco: string;
};

export function EditarForm({ ficha, aulas }: { ficha: AlumnoEditable; aulas: Aula[] }) {
  const [state, formAction, pending] = useActionState(actualizarAlumno, undefined);
  const [nuevosAutorizados, setNuevosAutorizados] = useState<NuevoAutorizado[]>([]);

  function actualizarNuevo(i: number, campo: keyof NuevoAutorizado, valor: string) {
    setNuevosAutorizados((prev) => prev.map((a, idx) => (idx === i ? { ...a, [campo]: valor } : a)));
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="alumno_id" value={ficha.id} />
      {ficha.matricula && <input type="hidden" name="matricula_id" value={ficha.matricula.id} />}
      <input type="hidden" name="nuevos_autorizados_json" value={JSON.stringify(nuevosAutorizados)} />

      <fieldset className="rounded-xl border border-stone-200 bg-white p-5">
        <legend className="px-1 text-sm font-semibold text-stone-900">Alumno</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nombre" name="alumno_nombre" type="text" defaultValue={ficha.nombre} />
          <Campo label="Apellido" name="alumno_apellido" type="text" defaultValue={ficha.apellido} />
          <Campo
            label="Fecha de nacimiento"
            name="fecha_nacimiento"
            type="date"
            defaultValue={ficha.fecha_nacimiento ?? ""}
            required={false}
          />
          {ficha.matricula && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-stone-700">Aula</span>
              <select
                name="aula_id"
                defaultValue={ficha.matricula.aula_id}
                className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              >
                {aulas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Textarea label="Datos médicos" name="datos_medicos" defaultValue={ficha.datos_medicos ?? ""} />
          <Textarea label="Alergias" name="alergias" defaultValue={ficha.alergias ?? ""} />
        </div>
      </fieldset>

      <ContactoFieldset
        titulo="Representante de pago"
        prefix="representante"
        contacto={ficha.representante}
        obligatorioSiVacio="Es quien recibe los recibos y a quien se le factura la mensualidad."
      />
      <ContactoFieldset titulo="Padre" prefix="padre" contacto={ficha.padre} />
      <ContactoFieldset titulo="Madre" prefix="madre" contacto={ficha.madre} />

      <fieldset className="rounded-xl border border-stone-200 bg-white p-5">
        <legend className="px-1 text-sm font-semibold text-stone-900">
          Personas autorizadas a retirar
        </legend>
        {ficha.autorizados.length > 0 && (
          <div className="mb-3 flex flex-col gap-1 text-sm text-stone-700">
            {ficha.autorizados.map((a) => (
              <p key={a.id}>
                {a.nombre} {a.apellido} {a.parentesco && `(${a.parentesco})`} — {a.cedula ?? "sin cédula"}
                {a.telefono && ` · ${a.telefono}`}
              </p>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-3">
          {nuevosAutorizados.map((a, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-stone-200 p-3 sm:grid-cols-5">
              <input
                placeholder="Nombre"
                value={a.nombre}
                onChange={(e) => actualizarNuevo(i, "nombre", e.target.value)}
                className="rounded-md border border-stone-300 px-2 py-1 text-sm"
              />
              <input
                placeholder="Apellido"
                value={a.apellido}
                onChange={(e) => actualizarNuevo(i, "apellido", e.target.value)}
                className="rounded-md border border-stone-300 px-2 py-1 text-sm"
              />
              <input
                placeholder="Cédula"
                value={a.cedula}
                onChange={(e) => actualizarNuevo(i, "cedula", e.target.value)}
                className="rounded-md border border-stone-300 px-2 py-1 text-sm"
              />
              <input
                placeholder="Teléfono"
                value={a.telefono}
                onChange={(e) => actualizarNuevo(i, "telefono", e.target.value)}
                className="rounded-md border border-stone-300 px-2 py-1 text-sm"
              />
              <div className="flex gap-2">
                <input
                  placeholder="Parentesco"
                  value={a.parentesco}
                  onChange={(e) => actualizarNuevo(i, "parentesco", e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setNuevosAutorizados((prev) => prev.filter((_, idx) => idx !== i))}
                  className="shrink-0 rounded-md border border-red-300 px-2 text-xs text-red-700 hover:bg-red-50"
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setNuevosAutorizados((prev) => [
                ...prev,
                { nombre: "", apellido: "", cedula: "", telefono: "", parentesco: "" },
              ])
            }
            className="self-start rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100"
          >
            + Agregar autorizado
          </button>
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
        {pending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}

function ContactoFieldset({
  titulo,
  prefix,
  contacto,
  obligatorioSiVacio,
}: {
  titulo: string;
  prefix: string;
  contacto: ContactoEditable | null;
  obligatorioSiVacio?: string;
}) {
  return (
    <fieldset className="rounded-xl border border-stone-200 bg-white p-5">
      <legend className="px-1 text-sm font-semibold text-stone-900">{titulo}</legend>
      {obligatorioSiVacio && <p className="mb-3 text-xs text-stone-500">{obligatorioSiVacio}</p>}
      {contacto && (
        <>
          <input type="hidden" name={`${prefix}_contacto_id`} value={contacto.contacto_id} />
          <input type="hidden" name={`${prefix}_persona_id`} value={contacto.persona_id} />
        </>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Nombre" name={`${prefix}_nombre`} type="text" defaultValue={contacto?.nombre ?? ""} required={false} />
        <Campo label="Apellido" name={`${prefix}_apellido`} type="text" defaultValue={contacto?.apellido ?? ""} required={false} />
        <Campo label="Cédula" name={`${prefix}_cedula`} type="text" defaultValue={contacto?.cedula ?? ""} required={false} />
        <Campo label="Teléfono" name={`${prefix}_telefono`} type="text" defaultValue={contacto?.telefono ?? ""} required={false} />
        {prefix === "representante" && (
          <Campo label="Email" name={`${prefix}_email`} type="email" defaultValue={contacto?.email ?? ""} required={false} />
        )}
      </div>
    </fieldset>
  );
}

function Campo({
  label,
  name,
  type,
  defaultValue,
  required = true,
}: {
  label: string;
  name: string;
  type: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
      />
    </label>
  );
}

function Textarea({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <textarea
        name={name}
        rows={2}
        defaultValue={defaultValue}
        className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
      />
    </label>
  );
}
