import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSolicitudPersonalDetalle } from "@/lib/queries/personal-solicitudes";
import { formatFecha, formatFechaHora } from "@/lib/format";
import { AprobarPersonalForm, RechazarPersonalForm } from "./revision-forms";

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente de revisión",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

export default async function SolicitudPersonalDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRol(["directora", "administracion"]);
  const { id } = await params;

  const sol = await getSolicitudPersonalDetalle(id);
  if (!sol) notFound();

  const supabase = await createClient();
  const { data: cargos } = await supabase.from("cargos").select("id, nombre").order("nombre");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/personal/solicitudes" className="text-xs text-stone-500 hover:underline">
          ← Volver a solicitudes de personal
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-stone-900">
            {String(sol.nombre)} {String(sol.apellido)}
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

      <Seccion titulo="Datos personales">
        <Campo label="Cédula" valor={sol.cedula} />
        <Campo label="País de nacimiento" valor={sol.pais_nacimiento} />
        <Campo label="Fecha de nacimiento" valor={fecha(sol.fecha_nacimiento)} />
        <Campo label="Correo electrónico" valor={sol.email} />
        <Campo label="Teléfono" valor={sol.telefono} />
        <Campo label="Fecha de ingreso al trabajo" valor={fecha(sol.fecha_ingreso)} />
      </Seccion>

      <Seccion titulo="Domicilio">
        <Campo label="Estado" valor={sol.domicilio_estado} />
        <Campo label="Municipio" valor={sol.domicilio_municipio} />
        <Campo label="Parroquia" valor={sol.domicilio_parroquia} />
        <Campo label="Dirección exacta" valor={sol.direccion} className="sm:col-span-2" />
      </Seccion>

      <Seccion titulo="Información académica">
        <Campo label="Título obtenido" valor={sol.titulo_obtenido} />
        <Campo label="Institución" valor={sol.institucion_titulo} />
        <Campo label="Fecha de obtención del título" valor={fecha(sol.fecha_obtencion_titulo)} />
      </Seccion>

      {sol.estado === "pendiente" && (
        <div className="flex flex-col gap-4">
          <AprobarPersonalForm
            solicitudId={sol.id}
            cargos={cargos ?? []}
            fechaIngresoSugerida={sol.fecha_ingreso ? String(sol.fecha_ingreso) : null}
          />
          <RechazarPersonalForm solicitudId={sol.id} />
        </div>
      )}

      {sol.estado === "aprobada" && sol.trabajador_creado_id != null && (
        <Link
          href={`/personal/${sol.trabajador_creado_id}`}
          className="self-start rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Ver ficha del trabajador creado
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
