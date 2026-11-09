"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { procesarPago } from "@/lib/pagos";
import { soloDigitos, sugerirConceptos } from "@/lib/matching-pagos";
import { leerOpcionesPago } from "@/lib/pagos-form";

export type ActionState = { error?: string } | undefined;

const texto = (formData: FormData, campo: string) => String(formData.get(campo) ?? "").trim();

// "María Pérez" -> nombre "María", apellido "Pérez"; con 4 palabras, dos y dos.
function dividirNombre(completo: string): { nombre: string; apellido: string } {
  const palabras = completo.split(/\s+/).filter(Boolean);
  const corte = palabras.length >= 4 ? 2 : 1;
  return { nombre: palabras.slice(0, corte).join(" "), apellido: palabras.slice(corte).join(" ") };
}

/**
 * Aprueba un pago de la bandeja: registra el pago real con la misma lógica
 * que "Registrar pago" y deja guardados los datos para la factura.
 */
export async function aprobarPendiente(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const id = texto(formData, "pendiente_id");
  const matriculaId = texto(formData, "matricula_id");
  const facturaNombre = texto(formData, "factura_nombre");
  const facturaCedula = texto(formData, "factura_cedula");

  if (!id || !matriculaId) return { error: "Falta elegir el alumno." };
  if (!facturaNombre || !soloDigitos(facturaCedula)) {
    return { error: "Indica el nombre y la cédula de quien va en la factura." };
  }

  // Se "reclama" la fila antes de registrar el pago: así un doble clic (o dos
  // personas a la vez) no puede registrar el mismo capture dos veces.
  const { data: reclamada } = await supabase
    .from("pagos_pendientes")
    .update({ estado: "aprobado", revisado_por: perfil.id, revisado_en: new Date().toISOString() })
    .eq("id", id)
    .eq("estado", "pendiente")
    .select("comprobante_url, banco")
    .maybeSingle();
  if (!reclamada) return { error: "Este pago ya fue procesado." };

  const moneda = texto(formData, "moneda_pago") || "BS";
  const monto = Number(formData.get("monto"));
  const fechaPago = texto(formData, "fecha_pago");
  const referencia = texto(formData, "referencia");
  const metodo = texto(formData, "metodo");

  const resultado = await procesarPago(supabase, {
    matriculaId,
    fechaPago,
    tasaBcv: Number(formData.get("tasa_bcv")),
    monedaPago: moneda,
    montoIngresado: monto,
    metodo,
    referencia,
    comprobanteUrl: reclamada.comprobante_url ?? "",
    conceptoIds: formData.getAll("concepto_id").map(String),
    registradoPorPerfilId: perfil.id,
    banco: reclamada.banco,
    ...leerOpcionesPago(formData),
    factura: {
      nombre: facturaNombre,
      cedula: facturaCedula,
      telefono: texto(formData, "factura_telefono"),
      direccion: texto(formData, "factura_direccion"),
    },
  });

  if ("error" in resultado) {
    // Si el pago llegó a crearse pero falló aplicarlo, la fila queda aprobada
    // para no duplicarlo; en cualquier otro error vuelve a la bandeja.
    if (!resultado.error.startsWith("El pago se registró")) {
      await supabase
        .from("pagos_pendientes")
        .update({ estado: "pendiente", revisado_por: null, revisado_en: null })
        .eq("id", id);
    }
    return resultado;
  }

  await supabase
    .from("pagos_pendientes")
    .update({
      pago_id: resultado.pagoId,
      matricula_id: matriculaId,
      monto_bs: moneda === "BS" ? monto : null,
      fecha_pago: fechaPago,
      referencia: referencia || null,
      metodo,
      factura_nombre: facturaNombre,
      factura_cedula: facturaCedula,
      factura_telefono: texto(formData, "factura_telefono") || null,
      factura_direccion: texto(formData, "factura_direccion") || null,
      concepto_libre: texto(formData, "concepto_libre") || null,
    })
    .eq("id", id);

  // Opcional: guardar a quien se factura como madre/padre del alumno, para que
  // la próxima vez el sistema ya lo tenga y no haya que pedirlo otra vez.
  const rol = texto(formData, "contacto_rol");
  if (formData.get("guardar_contacto") === "on" && (rol === "madre" || rol === "padre")) {
    const cedula = soloDigitos(facturaCedula);
    const { data: matricula } = await supabase.from("matriculas").select("alumno_id").eq("id", matriculaId).maybeSingle();
    if (matricula) {
      let { data: persona } = await supabase.from("personas").select("id").eq("cedula", cedula).maybeSingle();
      if (!persona) {
        const { nombre, apellido } = dividirNombre(facturaNombre);
        const { data: nueva } = await supabase
          .from("personas")
          .insert({ cedula, nombre, apellido, telefono: texto(formData, "factura_telefono") || null })
          .select("id")
          .single();
        persona = nueva;
      }
      if (persona) {
        await supabase
          .from("alumno_contactos")
          .upsert({ alumno_id: matricula.alumno_id, persona_id: persona.id, rol }, { onConflict: "alumno_id,persona_id,rol" });
      }
    }
  }

  revalidatePath("/cobranza/bandeja");
  redirect(`/cobranza/bandeja/${id}`);
}

export async function rechazarPendiente(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const perfil = await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const id = texto(formData, "pendiente_id");
  const motivo = texto(formData, "motivo");
  if (!id || !motivo) return { error: "Indica el motivo del rechazo." };

  const { data } = await supabase
    .from("pagos_pendientes")
    .update({
      estado: "rechazado",
      motivo_rechazo: motivo,
      revisado_por: perfil.id,
      revisado_en: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("estado", "pendiente")
    .select("id")
    .maybeSingle();
  if (!data) return { error: "Este pago ya fue procesado." };

  revalidatePath("/cobranza/bandeja");
  redirect("/cobranza/bandeja");
}

// Se llena después de escribir la factura en el talonario, para que el sistema
// sepa qué pago ya tiene factura (base del libro de ventas).
export async function guardarNumeroFactura(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const id = texto(formData, "pendiente_id");
  const { data: fila, error } = await supabase
    .from("pagos_pendientes")
    .update({
      factura_numero: texto(formData, "factura_numero") || null,
      factura_control: texto(formData, "factura_control") || null,
    })
    .eq("id", id)
    .eq("estado", "aprobado")
    .select("pago_id")
    .maybeSingle();
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  // El pago real es el registro único: el n.º de factura también se guarda ahí.
  if (fila?.pago_id) {
    await supabase
      .from("pagos")
      .update({
        factura_numero: texto(formData, "factura_numero") || null,
        factura_control: texto(formData, "factura_control") || null,
      })
      .eq("id", fila.pago_id);
  }

  revalidatePath(`/cobranza/bandeja/${id}`);
  return undefined;
}

/**
 * Regla del colegio: si llega un pago de un alumno que todavía no está registrado, se
 * incluye (inscrito, con su plan de pagos) y el resto de sus datos se completan después.
 * Queda ligado a este pago para poder aprobarlo enseguida.
 */
export async function crearAlumnoDesdePago(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRol(["directora", "administracion"]);
  const supabase = await createClient();

  const id = texto(formData, "pendiente_id");
  const nombre = texto(formData, "alumno_nombre");
  const apellido = texto(formData, "alumno_apellido");
  const aulaId = texto(formData, "aula_id");
  const fechaNacimiento = texto(formData, "fecha_nacimiento");

  if (!id || !nombre || !apellido || !aulaId) {
    return { error: "Indica nombre, apellido y aula del alumno." };
  }

  const { data: pago } = await supabase
    .from("pagos_pendientes")
    .select("id, nota, fecha_pago, lectura, matricula_id")
    .eq("id", id)
    .eq("estado", "pendiente")
    .maybeSingle();
  if (!pago) return { error: "Este pago ya fue procesado." };
  if (pago.matricula_id) return { error: "Este pago ya tiene un alumno asignado." };

  const { data: anio } = await supabase
    .from("anios_escolares")
    .select("id")
    .eq("activo", true)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!anio) return { error: "No hay un año escolar activo." };

  // Evita duplicar a un alumno que ya existe con ese mismo nombre.
  const { data: existentes } = await supabase
    .from("alumnos")
    .select("id")
    .ilike("nombre", nombre)
    .ilike("apellido", apellido)
    .limit(1);
  if (existentes && existentes.length > 0) {
    return { error: "Ya existe un alumno con ese nombre y apellido. Búscalo en lugar de crearlo de nuevo." };
  }

  const { data: alumno, error: errorAlumno } = await supabase
    .from("alumnos")
    .insert({ nombre, apellido, fecha_nacimiento: fechaNacimiento || null })
    .select("id")
    .single();
  if (errorAlumno || !alumno) return { error: `No se pudo crear el alumno: ${errorAlumno?.message}` };

  const { data: matricula, error: errorMatricula } = await supabase
    .from("matriculas")
    .insert({ alumno_id: alumno.id, anio_escolar_id: anio.id, aula_id: aulaId, estado: "inscrito" })
    .select("id")
    .single();
  if (errorMatricula || !matricula) return { error: `No se pudo crear la matrícula: ${errorMatricula?.message}` };

  const { error: errorPlan } = await supabase.rpc("generar_plan_pago", { p_matricula_id: matricula.id });
  if (errorPlan) {
    return { error: `El alumno se creó, pero falló el plan de pagos: ${errorPlan.message}` };
  }

  const lectura = (pago.lectura ?? null) as { mes_en_nota?: string | null; descripcion?: string | null } | null;
  const conceptos = await sugerirConceptos(
    matricula.id,
    [pago.nota, lectura?.mes_en_nota, lectura?.descripcion].filter(Boolean).join(" "),
    pago.fecha_pago,
  );

  await supabase
    .from("pagos_pendientes")
    .update({ matricula_id: matricula.id, conceptos_sugeridos: conceptos.ids })
    .eq("id", id);

  revalidatePath(`/cobranza/bandeja/${id}`);
  redirect(`/cobranza/bandeja/${id}`);
}
