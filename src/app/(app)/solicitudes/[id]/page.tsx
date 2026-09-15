import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSolicitudDetalle } from "@/lib/queries/solicitudes";
import { formatFecha, formatFechaHora } from "@/lib/format";
import { AprobarForm, RechazarForm } from "./revision-forms";

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente de revisión",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

export default async function SolicitudDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRol(["directora", "administracion"]);
  const { id } = await params;

  const sol = await getSolicitudDetalle(id);
  if (!sol) notFound();

  const supabase = await createClient();
  const [{ data: anioEscolar }, { data: aulas }] = await Promise.all([
    supabase
      .from("anios_escolares")
      .select("id, nombre")
      .eq("activo", true)
      .order("fecha_inicio", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("aulas").select("id, nombre").eq("activa", true).order("nombre"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/solicitudes" className="text-xs text-stone-500 hover:underline">
          ← Volver a solicitudes
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-stone-900">
            {String(sol.alumno_nombre)} {String(sol.alumno_apellido)}
          </h1>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
            {ESTADO_LABEL[sol.estado] ?? sol.estado}
          </span>
        </div>
        <p className="mt-1 text-xs text-stone-500">
          Enviada el {formatFechaHora(String(sol.creado_en))}
        </p>
      </div>

      {sol.estado === "rechazada" && Boolean(sol.motivo_rechazo) && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
          Motivo del rechazo: {String(sol.motivo_rechazo)}
        </div>
      )}

      <Seccion titulo="Datos del alumno">
        <Campo label="Fecha de nacimiento" valor={fecha(sol.alumno_fecha_nacimiento)} />
        <Campo label="Lugar de nacimiento" valor={sol.alumno_lugar_nacimiento} />
        <Campo label="Dirección" valor={sol.alumno_direccion} />
        <Campo label="Tipo de vivienda" valor={sol.alumno_tipo_vivienda} />
        <Campo label="Condición de la vivienda" valor={sol.alumno_condicion_vivienda} />
        <Campo label="Estado de la vivienda" valor={sol.alumno_estado_vivienda} />
        <Campo label="Teléfono de contacto rápido" valor={sol.telefono_contacto_rapido} />
      </Seccion>

      <SeccionPersona titulo="Datos de la madre" sol={sol} prefix="madre" />
      <SeccionPersona titulo="Datos del padre" sol={sol} prefix="padre" />

      <Seccion titulo="Representante de pago">
        <Campo label="Es" valor={String(sol.representante_es ?? "")} />
        <Campo label="Nombre" valor={`${sol.representante_nombre ?? ""} ${sol.representante_apellido ?? ""}`} />
        <Campo label="Cédula" valor={sol.representante_cedula} />
        <Campo label="Teléfono" valor={sol.representante_telefono} />
        <Campo label="Email" valor={sol.representante_email} />
        <Campo label="Dirección" valor={sol.representante_direccion} />
      </Seccion>

      <Seccion titulo="Personas autorizadas a retirar">
        {sol.autorizados_retiro_json.length === 0 ? (
          <p className="text-sm text-stone-500">No se registró ninguna.</p>
        ) : (
          <div className="overflow-x-auto sm:col-span-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                  <th className="py-1 pr-3 font-medium">Nombre</th>
                  <th className="py-1 pr-3 font-medium">Cédula</th>
                  <th className="py-1 pr-3 font-medium">Teléfono</th>
                  <th className="py-1 pr-3 font-medium">Parentesco</th>
                </tr>
              </thead>
              <tbody>
                {sol.autorizados_retiro_json.map((a, i) => (
                  <tr key={i} className="border-t border-stone-100">
                    <td className="py-1 pr-3">{a.nombre} {a.apellido}</td>
                    <td className="py-1 pr-3">{a.cedula}</td>
                    <td className="py-1 pr-3">{a.telefono}</td>
                    <td className="py-1 pr-3">{a.parentesco}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Seccion>

      <Seccion titulo="Salud">
        <Campo label="Datos médicos" valor={sol.datos_medicos} className="sm:col-span-2" />
        <Campo label="Alergias" valor={sol.alergias} className="sm:col-span-2" />
        <Campo label="Medicamento autorizado (fiebre/malestar)" valor={sol.medicamento_autorizado} />
        <Campo label="Dosis" valor={sol.dosis_medicamento_autorizado} />
      </Seccion>

      {sol.estado === "pendiente" && (
        <div className="flex flex-col gap-4">
          <AprobarForm
            solicitudId={sol.id}
            anioEscolarId={anioEscolar?.id ?? ""}
            aulas={aulas ?? []}
          />
          <RechazarForm solicitudId={sol.id} />
        </div>
      )}

      {sol.estado === "aprobada" && sol.alumno_creado_id != null && (
        <Link
          href={`/alumnos/${sol.alumno_creado_id}`}
          className="self-start rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Ver ficha del alumno creado
        </Link>
      )}
    </div>
  );
}

function fecha(v: unknown): string {
  return v ? formatFecha(String(v)) : "";
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-stone-200 bg-white p-5">
      <legend className="px-1 text-sm font-semibold text-stone-900">{titulo}</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Campo({
  label,
  valor,
  className,
}: {
  label: string;
  valor: unknown;
  className?: string;
}) {
  const texto = valor === null || valor === undefined || valor === "" ? "—" : String(valor);
  return (
    <div className={className}>
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="text-sm text-stone-900">{texto}</p>
    </div>
  );
}

function SeccionPersona({
  titulo,
  sol,
  prefix,
}: {
  titulo: string;
  sol: Record<string, unknown>;
  prefix: "madre" | "padre";
}) {
  const nombre = sol[`${prefix}_nombre`];
  if (!nombre) {
    return (
      <Seccion titulo={titulo}>
        <p className="text-sm text-stone-500 sm:col-span-2">No se registró.</p>
      </Seccion>
    );
  }

  const viveConNino = sol[`${prefix}_vive_con_nino`];

  return (
    <Seccion titulo={titulo}>
      <Campo label="Nombre" valor={`${sol[`${prefix}_nombre`] ?? ""} ${sol[`${prefix}_apellido`] ?? ""}`} />
      <Campo label="Cédula" valor={sol[`${prefix}_cedula`]} />
      <Campo label="Fecha de nacimiento" valor={fecha(sol[`${prefix}_fecha_nacimiento`])} />
      <Campo label="Lugar de nacimiento" valor={sol[`${prefix}_lugar_nacimiento`]} />
      <Campo label="Estado civil" valor={sol[`${prefix}_estado_civil`]} />
      <Campo label="Religión" valor={sol[`${prefix}_religion`]} />
      <Campo label="Grado de instrucción" valor={sol[`${prefix}_grado_instruccion`]} />
      <Campo label="Empresa donde labora" valor={sol[`${prefix}_empresa`]} />
      <Campo label="Dirección de trabajo" valor={sol[`${prefix}_direccion_trabajo`]} />
      <Campo label="Jefe inmediato" valor={sol[`${prefix}_jefe_inmediato`]} />
      <Campo label="Departamento" valor={sol[`${prefix}_departamento`]} />
      <Campo label="Antigüedad" valor={sol[`${prefix}_antiguedad`]} />
      <Campo label="Sueldo" valor={sol[`${prefix}_sueldo`]} />
      <Campo label="Horario de trabajo" valor={sol[`${prefix}_horario`]} />
      <Campo label="Teléfono celular" valor={sol[`${prefix}_telefono_celular`]} />
      <Campo label="Teléfono de habitación" valor={sol[`${prefix}_telefono_hab`]} />
      <Campo label="Otro teléfono" valor={sol[`${prefix}_telefono_otro`]} />
      <Campo label="Contacto de emergencia" valor={sol[`${prefix}_contacto_emergencia`]} />
      <Campo label="¿Vive con el niño(a)?" valor={viveConNino === true ? "Sí" : viveConNino === false ? "No" : ""} />
      <Campo label="Horario con el niño(a)" valor={sol[`${prefix}_horario_con_nino`]} />
      <Campo
        label="Motivo de elección de la institución"
        valor={sol[`${prefix}_motivo_institucion`]}
        className="sm:col-span-2"
      />
    </Seccion>
  );
}
