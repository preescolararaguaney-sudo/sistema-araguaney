import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatriculaDetallePublico } from "@/lib/queries/pagos-publico";
import { hoyCaracas } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { TablaCuotas } from "../../../(app)/cobranza/tabla-cuotas";
import { PagoFormPublico } from "./pago-form-publico";

export default async function AlumnoPagoPublicoPage({
  params,
}: {
  params: Promise<{ matriculaId: string }>;
}) {
  const { matriculaId } = await params;
  const detalle = await getMatriculaDetallePublico(matriculaId);
  if (!detalle) notFound();

  const hoy = hoyCaracas();
  const totalPendiente = detalle.cuotas
    .filter((c) => c.estado !== "pagado")
    .reduce((acc, c) => acc + (c.monto_usd - c.monto_usd_pagado), 0);

  const admin = createAdminClient();
  const { data: tasaHoy } = await admin
    .from("tasas_bcv")
    .select("tasa")
    .eq("fecha", hoy)
    .maybeSingle();

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <Link href="/pagos-publico" className="text-xs text-stone-500 hover:underline">
        ← Elegir otro alumno
      </Link>
      <h1 className="mt-1 text-lg font-semibold text-stone-900">
        {detalle.alumno_nombre} {detalle.alumno_apellido}
        <span className="ml-2 text-sm font-normal text-stone-500">— {detalle.aula_nombre}</span>
      </h1>
      <p className="mb-4 text-sm text-stone-600">
        Representante: {detalle.representante_nombre}
        {detalle.representante_telefono ? ` · ${detalle.representante_telefono}` : ""}
      </p>

      <PagoFormPublico
        matriculaId={matriculaId}
        fechaHoy={hoy}
        tasaHoy={tasaHoy ? Number(tasaHoy.tasa) : null}
        totalPendiente={totalPendiente}
      />

      <div className="mt-6">
        <TablaCuotas cuotas={detalle.cuotas} />
      </div>
    </div>
  );
}
