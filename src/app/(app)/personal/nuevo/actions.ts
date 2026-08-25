"use server";

import { redirect } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string } | undefined;

export async function crearTrabajador(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellido = String(formData.get("apellido") ?? "").trim();
  const cedula = String(formData.get("cedula") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const direccion = String(formData.get("direccion") ?? "").trim();
  const cargoId = String(formData.get("cargo_id") ?? "");
  const fechaIngreso = String(formData.get("fecha_ingreso") ?? "");
  const tipoContrato = String(formData.get("tipo_contrato") ?? "indefinido");
  const salarioBase = Number(formData.get("salario_base_mensual"));
  const salarioFormalRaw = formData.get("salario_formal_mensual_usd");
  const salarioFormal = salarioFormalRaw ? Number(salarioFormalRaw) : null;
  const banco = String(formData.get("banco") ?? "").trim();
  const numeroCuenta = String(formData.get("numero_cuenta") ?? "").trim();

  if (!nombre || !apellido || !cedula || !cargoId || !fechaIngreso) {
    return { error: "Completa nombre, apellido, cédula, cargo y fecha de ingreso." };
  }
  if (!salarioBase || salarioBase < 0) {
    return { error: "Indica el salario base mensual." };
  }

  const { data, error } = await supabase
    .from("trabajadores")
    .insert({
      nombre,
      apellido,
      cedula,
      telefono: telefono || null,
      direccion: direccion || null,
      cargo_id: cargoId,
      fecha_ingreso: fechaIngreso,
      tipo_contrato: tipoContrato || "indefinido",
      salario_base_mensual: salarioBase,
      salario_formal_mensual_usd: salarioFormal,
      banco: banco || null,
      numero_cuenta: numeroCuenta || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: `No se pudo crear el trabajador: ${error?.message}` };
  }

  redirect(`/personal/${data.id}`);
}
