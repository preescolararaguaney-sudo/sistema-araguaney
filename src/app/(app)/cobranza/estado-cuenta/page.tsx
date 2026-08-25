import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buscarMatriculas, getMatriculaDetalle } from "@/lib/queries/matriculas";
import { formatFecha, formatUsd, METODO_PAGO_LABEL } from "@/lib/format";
import { BuscadorAlumno } from "../buscador-alumno";
import { TablaCuotas } from "../tabla-cuotas";

export default async function EstadoCuentaPage({
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

    const { data: pagos } = await supabase
      .from("pagos")
      .select("id, numero_recibo, fecha_pago, monto_usd_total, monto_bs_total, metodo, anulado")
      .eq("matricula_id", matriculaId)
      .order("fecha_pago", { ascending: false });

    const totalDeuda = detalle.cuotas
      .filter((c) => c.estado !== "pagado")
      .reduce((acc, c) => acc + (c.monto_usd - c.monto_usd_pagado), 0);

    return (
      <div className="flex flex-col gap-6">
        <div>
          <Link href="/cobranza/estado-cuenta" className="text-xs text-stone-500 hover:underline">
            ← Buscar otro alumno
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-stone-900">
            {detalle.alumno_nombre} {detalle.alumno_apellido}
            <span className="ml-2 text-sm font-normal text-stone-500">
              — {detalle.aula_nombre} · {detalle.anio_escolar_nombre}
            </span>
          </h1>
          <p className="text-sm text-stone-600">
            Representante: {detalle.representante_nombre}
            {detalle.representante_telefono ? ` · ${detalle.representante_telefono}` : ""}
          </p>
          <p className="mt-1 text-sm font-medium text-stone-900">
            Saldo pendiente: {formatUsd(totalDeuda)}
          </p>
        </div>

        <TablaCuotas cuotas={detalle.cuotas} />

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
            Historial de pagos
          </p>
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
                  <th className="px-4 py-2 font-medium">Recibo</th>
                  <th className="px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 font-medium">Monto</th>
                  <th className="px-4 py-2 font-medium">Método</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {(pagos ?? []).map((p) => (
                  <tr key={p.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-2">
                      N.° {p.numero_recibo} {p.anulado && <span className="text-red-600">(anulado)</span>}
                    </td>
                    <td className="px-4 py-2">{formatFecha(p.fecha_pago)}</td>
                    <td className="px-4 py-2">{formatUsd(Number(p.monto_usd_total))}</td>
                    <td className="px-4 py-2">{METODO_PAGO_LABEL[p.metodo] ?? p.metodo}</td>
                    <td className="px-4 py-2">
                      <Link href={`/cobranza/pagos/${p.id}/recibo`} className="text-emerald-700 hover:underline">
                        Ver recibo
                      </Link>
                    </td>
                  </tr>
                ))}
                {(!pagos || pagos.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-center text-stone-500">
                      Sin pagos registrados todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const resultados = await buscarMatriculas(q, anioEscolar.id);

  return (
    <div>
      <h1 className="text-lg font-semibold text-stone-900">Estado de cuenta</h1>
      <p className="mt-1 mb-4 text-sm text-stone-600">
        Busca al alumno o representante para ver su plan de pagos completo.
      </p>
      <BuscadorAlumno basePath="/cobranza/estado-cuenta" q={q} resultados={resultados} />
    </div>
  );
}
