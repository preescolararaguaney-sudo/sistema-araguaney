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

export function InscripcionForm({ anioEscolarId }: { anioEscolarId: string }) {
  const [state, formAction, pending] = useActionState(crearSolicitud, undefined);
  const [autorizados, setAutorizados] = useState<Autorizado[]>([]);

  function actualizarAutorizado(i: number, campo: keyof Autorizado, valor: string) {
    setAutorizados((prev) => prev.map((a, idx) => (idx === i ? { ...a, [campo]: valor } : a)));
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="anio_escolar_id" value={anioEscolarId} />
      <input type="hidden" name="autorizados_json" value={JSON.stringify(autorizados)} />

      <Fieldset titulo="Datos del alumno">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Primer nombre y segundo nombre" name="alumno_nombre" />
          <Campo label="Primer apellido y segundo apellido" name="alumno_apellido" />
          <Campo label="Fecha de nacimiento" name="alumno_fecha_nacimiento" type="date" required={false} />
          <Campo label="Lugar de nacimiento" name="alumno_lugar_nacimiento" required={false} />
          <Campo label="Dirección de habitación" name="alumno_direccion" required={false} className="sm:col-span-2" />
          <Select label="Tipo de vivienda" name="alumno_tipo_vivienda" required={false}>
            <option value="">— Selecciona —</option>
            <option value="casa">Casa</option>
            <option value="apartamento">Apartamento</option>
            <option value="otros">Otros</option>
          </Select>
          <Select label="Condición de la vivienda" name="alumno_condicion_vivienda" required={false}>
            <option value="">— Selecciona —</option>
            <option value="propia">Propia</option>
            <option value="alquilada">Alquilada</option>
            <option value="invasion">Invasión</option>
            <option value="otros">Otros</option>
          </Select>
          <Select label="La vivienda se encuentra en" name="alumno_estado_vivienda" required={false}>
            <option value="">— Selecciona —</option>
            <option value="buen_estado">Buen estado</option>
            <option value="regular">Regular</option>
            <option value="riesgo">Riesgo</option>
          </Select>
          <Campo label="Teléfono de contacto rápido" name="telefono_contacto_rapido" />
        </div>
      </Fieldset>

      <DatosPadreMadre prefix="madre" titulo="Datos de la madre" />
      <DatosPadreMadre prefix="padre" titulo="Datos del padre" />

      <Fieldset titulo="Representante de pago" descripcion="Quien recibirá los recibos de pago y autoriza este formulario.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="El representante de pago es" name="representante_es" required defaultValue="madre">
            <option value="madre">La madre</option>
            <option value="padre">El padre</option>
            <option value="otro">Otra persona</option>
          </Select>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nombre" name="representante_nombre" />
          <Campo label="Apellido" name="representante_apellido" />
          <Campo label="Cédula de identidad" name="representante_cedula" placeholder="V-12345678" />
          <Campo label="Teléfono" name="representante_telefono" required={false} />
          <Campo label="Email" name="representante_email" type="email" required={false} />
          <Campo label="Dirección" name="representante_direccion" required={false} />
        </div>
      </Fieldset>

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
        {pending ? "Enviando..." : "Enviar solicitud de inscripción"}
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
        <Campo label="Fecha de nacimiento" name={`${prefix}_fecha_nacimiento`} type="date" required={false} />
        <Campo label="Lugar de nacimiento" name={`${prefix}_lugar_nacimiento`} required={false} />
        <Campo label="Estado civil" name={`${prefix}_estado_civil`} required={false} />
        <Campo label="Religión" name={`${prefix}_religion`} required={false} />
        <Campo label="Grado de instrucción" name={`${prefix}_grado_instruccion`} required={false} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Empresa donde labora" name={`${prefix}_empresa`} required={false} />
        <Campo label="Dirección de trabajo" name={`${prefix}_direccion_trabajo`} required={false} />
        <Campo label="Jefe inmediato" name={`${prefix}_jefe_inmediato`} required={false} />
        <Campo label="Departamento" name={`${prefix}_departamento`} required={false} />
        <Campo label="Antigüedad" name={`${prefix}_antiguedad`} required={false} />
        <Campo label="Sueldo" name={`${prefix}_sueldo`} required={false} />
        <Campo label="Horario de trabajo" name={`${prefix}_horario`} required={false} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Teléfono celular" name={`${prefix}_telefono_celular`} required={false} />
        <Campo label="Teléfono de habitación" name={`${prefix}_telefono_hab`} required={false} />
        <Campo label="Otro teléfono" name={`${prefix}_telefono_otro`} required={false} />
        <Campo label="En caso de emergencia contactar a" name={`${prefix}_contacto_emergencia`} required={false} />
        <Select label="¿Vive con el niño(a)?" name={`${prefix}_vive_con_nino`} required={false}>
          <option value="">— Selecciona —</option>
          <option value="si">Sí</option>
          <option value="no">No</option>
        </Select>
        <Campo label="¿En qué horario está con el niño(a)?" name={`${prefix}_horario_con_nino`} required={false} />
        <Textarea
          label="¿Por qué seleccionó esta institución para su hijo(a)?"
          name={`${prefix}_motivo_institucion`}
          className="sm:col-span-2"
        />
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
  className,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
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
        className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
      />
    </label>
  );
}

function Select({
  label,
  name,
  required = true,
  defaultValue = "",
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
      >
        {children}
      </select>
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
