import Link from "next/link";
import { getPerfil } from "@/lib/auth";
import { getTrabajadorFicha } from "@/lib/queries/personal";
import { createClient } from "@/lib/supabase/server";
import { formatFecha, formatUsd, formatBs } from "@/lib/format";
import { EstadoForm } from "./estado-form";
import { NovedadForm } from "./novedad-form";
import { AulaForm } from "./aula-form";
import { AccesoForm } from "./acceso-form";

export default async function TrabajadorDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const perfil = await getPerfil();
  const { id } = await params;
  const ficha = await getTrabajadorFicha(id);

  if (!ficha) {
    return <p className="text-sm text-red-700">No se encontró el trabajador.</p>;
  }

  const supabase = await createClient();
  const { data: aulas } = await supabase.from("aulas").select("id, nombre").eq("activa", true).order("nombre");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/personal" className="text-xs text-stone-500 hover:underline">
          ← Volver a personal
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-stone-900">
          {ficha.nombre} {ficha.apellido}
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          {ficha.cargo_nombre} · Ingresó el {formatFecha(ficha.fecha_ingreso)} · {ficha.tipo_contrato}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">Datos personales</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <Dato etiqueta="Cédula" valor={ficha.cedula} />
            <Dato etiqueta="Teléfono" valor={ficha.telefono || "—"} />
            <Dato etiqueta="Dirección" valor={ficha.direccion || "—"} />
            <Dato etiqueta="Sueldo mensual objetivo" valor={formatUsd(ficha.salario_base_mensual)} />
            <Dato
              etiqueta="Salario formal mensual (nómina legal)"
              valor={ficha.salario_formal_mensual_bs !== null ? formatBs(ficha.salario_formal_mensual_bs) : "—"}
            />
            <Dato
              etiqueta="Datos bancarios"
              valor={ficha.banco ? `${ficha.banco} — ${ficha.numero_cuenta ?? ""}` : "—"}
            />
          </dl>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">Estado</h2>
          <EstadoForm trabajadorId={ficha.id} estadoActual={ficha.estado} />
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">
            Reposos, permisos y vacaciones
          </h2>
          <NovedadForm trabajadorId={ficha.id} novedades={ficha.novedades} />
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">Aulas asignadas</h2>
          <AulaForm trabajadorId={ficha.id} aulas={aulas ?? []} asignaciones={ficha.aulas} />
        </section>

        {perfil?.rol === "directora" && (
          <section className="rounded-xl border border-stone-200 bg-white p-5 lg:col-span-2">
            <h2 className="mb-3 text-sm font-semibold text-stone-900">Acceso al sistema</h2>
            {ficha.tienePerfil ? (
              <p className="text-sm text-stone-600">Este trabajador ya tiene un usuario de acceso.</p>
            ) : (
              <AccesoForm trabajadorId={ficha.id} nombreSugerido={`${ficha.nombre} ${ficha.apellido}`} />
            )}
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
