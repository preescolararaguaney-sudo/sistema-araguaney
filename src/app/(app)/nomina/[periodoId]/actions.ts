"use server";

import { revalidatePath } from "next/cache";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getParametrosVigentes } from "@/lib/queries/nomina";
import { hoyCaracas } from "@/lib/format";

export type ActionState = { error?: string } | undefined;

type FilaGeneracion = {
  trabajador_id: string;
  dias_trabajados: number;
  dias_descanso: number;
  monto_objetivo_usd: number;
  incluir_cestaticket: boolean;
};

export async function generarNominaPeriodo(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const periodoId = String(formData.get("periodo_id") ?? "");
  const tasa = Number(formData.get("tasa_bcv"));
  const fechaPago = String(formData.get("fecha_pago") ?? hoyCaracas());

  if (!periodoId || !tasa || tasa <= 0) {
    return { error: "Indica el período y una tasa BCV válida." };
  }

  let filas: FilaGeneracion[] = [];
  try {
    filas = JSON.parse(String(formData.get("filas_json") ?? "[]"));
  } catch {
    return { error: "No se pudo leer la lista de trabajadores." };
  }
  if (filas.length === 0) {
    return { error: "No hay trabajadores para generar." };
  }

  const params = await getParametrosVigentes(fechaPago);

  const { data: conceptos } = await supabase.from("nomina_conceptos").select("id, codigo");
  const conceptoId = (codigo: string) => conceptos?.find((c) => c.codigo === codigo)?.id;

  const idsFaltantes = ["salario_formal", "ivss", "rpe", "faov", "bono", "cestaticket"].filter(
    (c) => !conceptoId(c),
  );
  if (idsFaltantes.length > 0) {
    return { error: `Faltan conceptos de nómina en el catálogo: ${idsFaltantes.join(", ")}.` };
  }

  const { data: trabajadores } = await supabase
    .from("trabajadores")
    .select("id, salario_formal_mensual_bs")
    .in(
      "id",
      filas.map((f) => f.trabajador_id),
    );

  let generados = 0;
  for (const fila of filas) {
    const trabajador = trabajadores?.find((t) => t.id === fila.trabajador_id);
    // Ya está en bolívares: va atado al salario mínimo legal (que el
    // gobierno fija en Bs), así que NO se reconvierte con la tasa del día
    // — a diferencia del bono, que sí se calcula en USD a la tasa.
    const salarioFormalMensualBs = Number(trabajador?.salario_formal_mensual_bs ?? 0);
    const diasTotal = fila.dias_trabajados + fila.dias_descanso;

    const salarioDiarioBs = salarioFormalMensualBs / 30;
    const salarioFormalAsignacionBs = round2(diasTotal * salarioDiarioBs);

    const ivss = round2(salarioFormalAsignacionBs * params.ivssPct);
    const rpe = round2(salarioFormalAsignacionBs * params.rpePct);
    const faov = round2(salarioFormalAsignacionBs * params.faovPct);
    const netoFormalBs = salarioFormalAsignacionBs - ivss - rpe - faov;

    const objetivoBs = fila.monto_objetivo_usd * tasa;
    const bonoBs = round2(Math.max(0, objetivoBs - netoFormalBs));
    const cestaticketBs = fila.incluir_cestaticket ? round2(params.cestaticketUsd * tasa) : 0;

    const totalAsignaciones = round2(salarioFormalAsignacionBs + bonoBs + cestaticketBs);
    const totalDeducciones = round2(ivss + rpe + faov);
    const netoPagar = round2(totalAsignaciones - totalDeducciones);

    const { data: recibo, error: errorRecibo } = await supabase
      .from("recibos_nomina")
      .insert({
        trabajador_id: fila.trabajador_id,
        periodo_nomina_id: periodoId,
        tasa_bcv_valor: tasa,
        dias_trabajados: fila.dias_trabajados,
        dias_descanso: fila.dias_descanso,
        total_asignaciones: totalAsignaciones,
        total_deducciones: totalDeducciones,
        neto_pagar: netoPagar,
        generado_por: perfil.id,
      })
      .select("id")
      .single();

    if (errorRecibo || !recibo) {
      return { error: `Falló al generar la nómina de un trabajador: ${errorRecibo?.message}` };
    }

    const detalle = [
      {
        recibo_nomina_id: recibo.id,
        concepto_id: conceptoId("salario_formal"),
        monto: salarioFormalAsignacionBs,
        base_calculo: diasTotal,
      },
      { recibo_nomina_id: recibo.id, concepto_id: conceptoId("ivss"), monto: ivss, base_calculo: salarioFormalAsignacionBs },
      { recibo_nomina_id: recibo.id, concepto_id: conceptoId("rpe"), monto: rpe, base_calculo: salarioFormalAsignacionBs },
      { recibo_nomina_id: recibo.id, concepto_id: conceptoId("faov"), monto: faov, base_calculo: salarioFormalAsignacionBs },
      { recibo_nomina_id: recibo.id, concepto_id: conceptoId("bono"), monto: bonoBs, base_calculo: null },
    ];
    if (fila.incluir_cestaticket) {
      detalle.push({ recibo_nomina_id: recibo.id, concepto_id: conceptoId("cestaticket"), monto: cestaticketBs, base_calculo: null });
    }

    const { error: errorDetalle } = await supabase.from("nomina_detalle").insert(detalle);
    if (errorDetalle) {
      return { error: `El recibo se creó pero falló su detalle: ${errorDetalle.message}` };
    }

    generados++;
  }

  revalidatePath(`/nomina/${periodoId}`);
  return generados === filas.length ? undefined : { error: "Algunos recibos no se pudieron generar." };
}

export async function anularReciboNomina(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const reciboId = String(formData.get("recibo_id") ?? "");
  const periodoId = String(formData.get("periodo_id") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!reciboId || !motivo) {
    return { error: "Indica el motivo de la anulación." };
  }

  const { error } = await supabase
    .from("recibos_nomina")
    .update({ anulado: true, motivo_anulacion: motivo })
    .eq("id", reciboId);

  if (error) {
    return { error: `No se pudo anular: ${error.message}` };
  }

  revalidatePath(`/nomina/${periodoId}`);
  return undefined;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
