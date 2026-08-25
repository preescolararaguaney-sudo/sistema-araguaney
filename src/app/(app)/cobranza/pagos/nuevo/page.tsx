import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buscarMatriculas, getMatriculaDetalle } from "@/lib/queries/matriculas";
import { hoyCaracas } from "@/lib/format";
import { BuscadorAlumno } from "../../buscador-alumno";
import { TablaCuotas } from "../../tabla-cuotas";
import { PagoForm } from "./pago-form";

export default async function RegistrarPagoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; matricula?: string }>;
}) {
  await requireRol(["directora", "administracion"]);
  const { q = "", matricula: matriculaId } = await searchParams;
  const supabase = await createClient();

  const { data: anioEscolar } = await supabase
    .from("anios_escolares")
    .select("id, nombre")
    .eq("activo", true)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!anioEscolar) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-base font-semibold text-amber-900">
          No hay un año escolar activo
        </h1>
        <p className="mt-2 text-sm text-amber-800">
          Créalo en{" "}
          <Link href="/configuracion/calendario" className="underline">
            Año escolar y lapsos
          </Link>
          .
        </p>
      </div>
    );
  }

  if (matriculaId) {
    const detalle = await getMatriculaDetalle(matriculaId);
    if (!detalle) {
      return <p className="text-sm text-red-700">No se encontró esa matrícula.</p>;
    }

    const hoy = hoyCaracas();
    const totalPendiente = detalle.cuotas
      .filter((c) => c.estado !== "pagado")
      .reduce((acc, c) => acc + (c.monto_usd - c.monto_usd_pagado), 0);

    const { data: tasaHoy } = await supabase
      .from("tasas_bcv")
      .select("tasa")
      .eq("fecha", hoy)
      .maybeSingle();

    return (
      <div className="flex flex-col gap-6">
        <div>
          <Link href="/cobranza/pagos/nuevo" className="text-xs text-stone-500 hover:underline">
            ← Buscar otro alumno
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-stone-900">
            {detalle.alumno_nombre} {detalle.alumno_apellido}
            <span className="ml-2 text-sm font-normal text-stone-500">
              — {detalle.aula_nombre}
            </span>
          </h1>
          <p className="text-sm text-stone-600">
            Representante: {detalle.representante_nombre}
            {detalle.representante_telefono ? ` · ${detalle.representante_telefono}` : ""}
          </p>
        </div>

        <PagoForm
          matriculaId={matriculaId}
          fechaHoy={hoy}
          tasaHoy={tasaHoy ? Number(tasaHoy.tasa) : null}
          totalPendiente={totalPendiente}
        />

        <TablaCuotas cuotas={detalle.cuotas} />
      </div>
    );
  }

  const resultados = await buscarMatriculas(q, anioEscolar.id);

  return (
    <div>
      <h1 className="text-lg font-semibold text-stone-900">Registrar pago</h1>
      <p className="mt-1 mb-4 text-sm text-stone-600">
        Busca al alumno o representante para ver sus cuotas pendientes.
      </p>
      <BuscadorAlumno basePath="/cobranza/pagos/nuevo" q={q} resultados={resultados} />
    </div>
  );
}
