import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { subirComprobante } from "@/lib/comprobantes";
import { leerCapture, type Lectura } from "@/lib/lectura-capture";
import {
  buscarCandidatos,
  candidatoClaro,
  destinatarioFactura,
  soloDigitos,
  sugerirConceptos,
} from "@/lib/matching-pagos";
import { descargarArchivo, enviarMensaje, usuariosAutorizados } from "@/lib/telegram";

type TgMessage = {
  message_id: number;
  from?: { id: number; first_name?: string };
  chat: { id: number; type: string };
  text?: string;
  caption?: string;
  photo?: { file_id: string; file_unique_id: string; width: number; height: number }[];
  document?: { file_id: string; file_unique_id: string; mime_type?: string };
};

export type TgUpdate = { update_id: number; message?: TgMessage };

const BASE_URL = process.env.APP_URL ?? "https://sistema-araguaney.vercel.app";

const AYUDA = `Hola. Reenvíame el capture de cada pago, de a uno. Si le escribes una nota (por ejemplo "thiago rondon octubre") identifico al alumno y la cuota más rápido.

Yo solo recibo los pagos y los dejo en la bandeja del sistema: ${BASE_URL}/cobranza/bandeja
Ahí los revisas, los apruebas y completas lo de la factura.`;

const bs = (n: number) =>
  n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fechaCorta = (iso: string) => iso.split("-").reverse().join("/");

function elegirArchivo(msg: TgMessage): { fileId: string; uniqueId: string } | null {
  if (msg.photo?.length) {
    const mayor = msg.photo.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a));
    return { fileId: mayor.file_id, uniqueId: mayor.file_unique_id };
  }
  const doc = msg.document;
  if (doc && (doc.mime_type?.startsWith("image/") || doc.mime_type === "application/pdf")) {
    return { fileId: doc.file_id, uniqueId: doc.file_unique_id };
  }
  return null;
}

/**
 * El bot solo recibe capture y los deja en la bandeja del sistema. No hace
 * preguntas: lo que falte (alumno, datos de factura) se completa en el sistema.
 */
export async function procesarUpdate(update: TgUpdate): Promise<void> {
  const msg = update.message;
  if (!msg) return;

  const userId = msg.from?.id;
  if (!userId || !usuariosAutorizados().has(userId)) {
    if (msg.chat.type === "private") {
      await enviarMensaje(
        msg.chat.id,
        `No estás autorizado para usar este bot. Tu ID de Telegram es ${userId ?? "desconocido"}.`,
      );
    }
    return;
  }

  const archivo = elegirArchivo(msg);
  if (archivo) return procesarCapture(msg, archivo);

  if (msg.text) {
    await enviarMensaje(msg.chat.id, AYUDA);
  }
}

async function procesarCapture(
  msg: TgMessage,
  archivo: { fileId: string; uniqueId: string },
): Promise<void> {
  const chatId = msg.chat.id;
  const nota = msg.caption ?? "";
  const admin = createAdminClient();

  const descargado = await descargarArchivo(archivo.fileId);
  if ("error" in descargado) {
    await enviarMensaje(chatId, `No pude descargar ese archivo: ${descargado.error}`, msg.message_id);
    return;
  }

  const resultado = await leerCapture(descargado, nota);
  const lectura: Lectura | null = "lectura" in resultado ? resultado.lectura : null;

  if (lectura && !lectura.es_comprobante) {
    await enviarMensaje(chatId, "Eso no parece un comprobante de pago, no lo guardé.", msg.message_id);
    return;
  }

  const subida = await subirComprobante(
    new File([descargado.buffer], `capture.${descargado.extension}`, { type: descargado.contentType }),
  );
  if ("error" in subida) {
    await enviarMensaje(chatId, subida.error, msg.message_id);
    return;
  }

  const fechaValida = lectura?.fecha && /^\d{4}-\d{2}-\d{2}$/.test(lectura.fecha) ? lectura.fecha : null;
  const referencia = lectura?.referencia ? soloDigitos(lectura.referencia) || null : null;

  // Duplicados: la misma referencia ya está en la bandeja o ya es un pago real.
  let duplicado = false;
  if (referencia) {
    const [{ count: enBandeja }, { count: enPagos }] = await Promise.all([
      admin
        .from("pagos_pendientes")
        .select("id", { count: "exact", head: true })
        .eq("referencia", referencia)
        .in("estado", ["pendiente", "aprobado"]),
      admin.from("pagos").select("id", { count: "exact", head: true }).eq("referencia", referencia),
    ]);
    duplicado = (enBandeja ?? 0) > 0 || (enPagos ?? 0) > 0;
  }

  const candidatos = lectura
    ? await buscarCandidatos([nota, lectura.alumno_en_nota, lectura.descripcion], {
        nombre: lectura.emisor_nombre,
        cedula: lectura.emisor_cedula,
      })
    : await buscarCandidatos([nota]);
  const claro = candidatoClaro(candidatos);
  const destinatario = claro ? destinatarioFactura(claro) : null;
  const conceptos = claro
    ? await sugerirConceptos(claro.matriculaId, lectura?.mes_en_nota ?? nota)
    : { ids: [], descripciones: [] };

  const { data: fila, error } = await admin
    .from("pagos_pendientes")
    .insert({
      telegram_chat_id: chatId,
      telegram_message_id: msg.message_id,
      telegram_file_unique_id: archivo.uniqueId,
      enviado_por: msg.from?.first_name ?? null,
      nota: nota || null,
      comprobante_url: subida.url,
      lectura: lectura ?? null,
      monto_bs: lectura?.monto_bs ?? null,
      fecha_pago: fechaValida,
      referencia,
      banco: lectura?.banco ?? null,
      metodo: lectura?.metodo ?? null,
      emisor_nombre: lectura?.emisor_nombre ?? null,
      emisor_cedula: lectura?.emisor_cedula ? soloDigitos(lectura.emisor_cedula) : null,
      matricula_id: claro?.matriculaId ?? null,
      conceptos_sugeridos: conceptos.ids,
      factura_nombre: destinatario?.nombre ?? null,
      factura_cedula: destinatario?.cedula ?? null,
      factura_telefono: destinatario?.telefono ?? null,
      estado: duplicado ? "duplicado" : "pendiente",
    })
    .select("id")
    .single();

  if (error || !fila) {
    // 23505 = el mismo mensaje ya se procesó (Telegram reintentó); no se responde dos veces.
    if (error?.code !== "23505") {
      await enviarMensaje(chatId, "No pude guardar el pago en la bandeja. Intenta de nuevo.", msg.message_id);
    }
    return;
  }

  // Confirmación de una línea: qué se leyó y a quién se asoció. Sin preguntas.
  const partes: string[] = [];
  if (!lectura) {
    partes.push("Guardé el capture, pero no pude leerlo; completa los datos en el sistema.");
  } else {
    partes.push(duplicado ? "⚠️ Referencia repetida, la marqué como duplicada." : "Recibido ✅");
    partes.push(
      [
        lectura.monto_bs != null ? `Bs ${bs(lectura.monto_bs)}` : null,
        fechaValida ? fechaCorta(fechaValida) : null,
        referencia ? `ref. ${referencia}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    );
  }
  partes.push(claro ? `Alumno: ${claro.alumnoNombre} (${claro.aula})` : "Alumno: sin identificar (lo eliges en el sistema)");
  partes.push(`${BASE_URL}/cobranza/bandeja/${fila.id}`);

  await enviarMensaje(chatId, partes.filter(Boolean).join("\n"), msg.message_id);
}
