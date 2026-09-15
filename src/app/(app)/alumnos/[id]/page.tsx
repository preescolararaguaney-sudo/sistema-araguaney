import Link from "next/link";
import { getPerfil } from "@/lib/auth";
import { getAlumnoFicha } from "@/lib/queries/alumno-ficha";
import { formatFecha } from "@/lib/format";
import { EstadoForm } from "./estado-form";
import { CopiarLinkFormulario } from "./copiar-link-form";

const ROL_LABEL: Record<string, string> = {
  representante_pago: "Representante de pago",
  padre: "Padre",
  madre: "Madre",
  tutor: "Tutor",
  otro: "Otro",
};

const ESTADO_LABEL: Record<string, string> = {
  preinscrito: "Preinscrito",
  inscrito: "Inscrito",
  retirado: "Retirado",
  egresado: "Egresado",
};

export default async function AlumnoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const perfil = await getPerfil();
  const { id } = await params;
  const ficha = await getAlumnoFicha(id);
  const esAdmin = perfil?.rol === "directora" || perfil?.rol === "administracion";

  if (!ficha) {
    return <p className="text-sm text-red-700">No se encontró el alumno.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/alumnos" className="text-xs text-stone-500 hover:underline">
          ← Volver a alumnos
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-stone-900">
            {ficha.nombre} {ficha.apellido}
          </h1>
          {esAdmin && (
            <div className="flex gap-2">
              <Link
                href={`/alumnos/${ficha.id}/editar`}
                className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100"
              >
                Editar ficha
              </Link>
              <CopiarLinkFormulario alumnoId={ficha.id} />
              {ficha.matricula && (
                <>
                  <Link
                    href={`/cobranza/estado-cuenta?matricula=${ficha.matricula.id}`}
                    className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100"
                  >
                    Estado de cuenta
                  </Link>
                  <Link
                    href={`/cobranza/pagos/nuevo?matricula=${ficha.matricula.id}`}
                    className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
                  >
                    Registrar pago
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
        {ficha.matricula && (
          <p className="mt-1 text-sm text-stone-600">
            {ficha.matricula.aula_nombre} · {ficha.matricula.anio_escolar_nombre} ·{" "}
            <span className="font-medium">{ESTADO_LABEL[ficha.matricula.estado] ?? ficha.matricula.estado}</span>
            {ficha.matricula.estado === "retirado" && ficha.matricula.fecha_retiro && (
              <> — retirado el {formatFecha(ficha.matricula.fecha_retiro)}
                {ficha.matricula.motivo_retiro && ` (${ficha.matricula.motivo_retiro})`}
              </>
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">Datos del alumno</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <Dato
              etiqueta="Fecha de nacimiento"
              valor={ficha.fecha_nacimiento ? formatFecha(ficha.fecha_nacimiento) : "— (pendiente)"}
            />
            <Dato etiqueta="Datos médicos" valor={ficha.datos_medicos || "—"} />
            <Dato etiqueta="Alergias" valor={ficha.alergias || "—"} />
          </dl>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">Contactos</h2>
          <div className="flex flex-col gap-3">
            {ficha.contactos.map((c, i) => (
              <div key={i} className="text-sm">
                <p className="font-medium text-stone-900">
                  {ROL_LABEL[c.rol] ?? c.rol}: {c.nombre} {c.apellido}
                </p>
                <p className="text-xs text-stone-500">
                  {c.cedula ?? "sin cédula"} {c.telefono && `· ${c.telefono}`} {c.email && `· ${c.email}`}
                </p>
              </div>
            ))}
            {ficha.contactos.length === 0 && (
              <p className="text-sm text-stone-500">Sin contactos registrados.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">Autorizados a retirar</h2>
          <div className="flex flex-col gap-3">
            {ficha.autorizados.map((a, i) => (
              <div key={i} className="text-sm">
                <p className="font-medium text-stone-900">
                  {a.nombre} {a.apellido} {a.parentesco && `(${a.parentesco})`}
                </p>
                <p className="text-xs text-stone-500">
                  {a.cedula ?? "sin cédula"} {a.telefono && `· ${a.telefono}`}
                </p>
              </div>
            ))}
            {ficha.autorizados.length === 0 && (
              <p className="text-sm text-stone-500">Sin personas autorizadas registradas.</p>
            )}
          </div>
        </section>

        {esAdmin && ficha.matricula && (
          <section className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-stone-900">Matrícula</h2>
            <EstadoForm
              matriculaId={ficha.matricula.id}
              alumnoId={ficha.id}
              estadoActual={ficha.matricula.estado}
            />
          </section>
        )}
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-stone-500">{etiqueta}</dt>
      <dd className="text-stone-900">{valor}</dd>
    </div>
  );
}
