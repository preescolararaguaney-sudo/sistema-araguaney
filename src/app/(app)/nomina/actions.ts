"use server";

import { redirect } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hoyCaracas } from "@/lib/format";
import { periodoDeFecha } from "@/lib/queries/nomina";

export type ActionState = { error?: string } | undefined;

/** Crea (si no existe) el período de la quincena actual y navega a él. */
export async function irAPeriodoActual(): Promise<void> {
  await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const info = periodoDeFecha(hoyCaracas());

  const { data: existente } = await supabase
    .from("periodos_nomina")
    .select("id")
    .eq("anio", info.anio)
    .eq("mes", info.mes)
    .eq("quincena", info.quincena)
    .maybeSingle();

  if (existente) {
    redirect(`/nomina/${existente.id}`);
  }

  const { data: nuevo, error } = await supabase
    .from("periodos_nomina")
    .insert({
      anio: info.anio,
      mes: info.mes,
      quincena: info.quincena,
      fecha_inicio: info.fecha_inicio,
      fecha_fin: info.fecha_fin,
    })
    .select("id")
    .single();

  if (error || !nuevo) {
    throw new Error(`No se pudo crear el período: ${error?.message}`);
  }

  redirect(`/nomina/${nuevo.id}`);
}
