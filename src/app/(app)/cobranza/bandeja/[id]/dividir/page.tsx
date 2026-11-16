import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPagoPendiente } from "@/lib/queries/bandeja";
import { buscarMatriculas, getMatriculaDetalle } from "@/lib/queries/matriculas";
import { formatBs } from "@/lib/format";
import { BuscadorAlumno } from "../../../buscador-alumno";
import { DividirForm } from "./dividir-form";

export default async function DividirPagoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ matricula?: string; q?: string }>;
}) {
  await requireRol(["directora", "administracion"]);
  const { id } = await params;
  const { matricula: matriculaId, q = "" } = await searchParams;

  const p = await getPagoPendiente(id);
  if (!p || p.estado !== "pendiente" || p.monto_bs == null) notFound();

  const supabase = await createClient();
  const { data: anio } = await supabase
    .from("anios_escolares")
    .select("id")
    .eq("activo", true)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();

  const detalle = matriculaId ? await getMatriculaDetalle(matriculaId) : null;
  const resultados = !detalle && anio ? await buscarMatriculas(q, anio.id) : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/cobranza/bandeja/${id}`} className="text-xs text-stone-500 hover:underline">
          ← Volver al pago
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-stone-900">Dividir el pago entre alumnos</h1>
        <p className="text-sm text-stone-600">
          Una transferencia puede pagar a dos hermanos. Cada alumno necesita su propio pago, así que aquí se separa
          la parte del otro alumno (misma referencia y mismo capture). Pago actual:{" "}
          <strong>{formatBs(p.monto_bs)}</strong>
          {p.alumno_nombre ? ` — hoy a nombre de ${p.alumno_nombre}` : " — sin alumno"}.
        </p>
      </div>

      {detalle ? (
        <DividirForm
          pendienteId={id}
          matriculaId={detalle.matricula_id}
          alumno={`${detalle.alumno_nombre} ${detalle.alumno_apellido} (${detalle.aula_nombre})`}
          montoTotal={p.monto_bs}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-stone-700">¿Quién es el otro alumno?</p>
          <BuscadorAlumno basePath={`/cobranza/bandeja/${id}/dividir`} q={q} resultados={resultados} />
        </div>
      )}
    </div>
  );
}
