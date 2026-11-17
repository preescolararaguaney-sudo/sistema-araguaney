import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

// Lo que la IA extrae de un capture de pago. Todo es nullable: si algo no se
// ve en la imagen, la IA debe devolver null en vez de inventarlo.
export const LecturaSchema = z.object({
  es_comprobante: z.boolean(),
  monto_bs: z.number().nullable(),
  fecha: z.string().nullable(), // YYYY-MM-DD
  referencia: z.string().nullable(),
  banco: z.string().nullable(),
  metodo: z.enum(["transferencia_bs", "pago_movil", "zelle", "efectivo_bs", "efectivo_usd", "otro"]).nullable(),
  emisor_nombre: z.string().nullable(),
  emisor_cedula: z.string().nullable(),
  descripcion: z.string().nullable(),
  alumno_en_nota: z.string().nullable(),
  mes_en_nota: z.string().nullable(),
  observaciones: z.string().nullable(),
});

export type Lectura = z.infer<typeof LecturaSchema>;

const SISTEMA = `Eres el asistente de cobranza de un preescolar en Caracas, Venezuela. Recibes la imagen de un comprobante de pago (transferencia bancaria, pago móvil, Zelle) que un representante envió por WhatsApp, y opcionalmente una nota escrita por la persona que lo reenvía.

Extrae solo lo que se ve. Reglas:
- Si la imagen no es un comprobante de pago, pon es_comprobante=false y el resto en null.
- monto_bs: el monto en bolívares como número (los bancos venezolanos escriben 131.520,00: punto de miles, coma decimal → 131520.00). Si el comprobante está en dólares, pon null y explícalo en observaciones.
- fecha: formato YYYY-MM-DD. Las fechas venezolanas son día/mes/año (09/10/2026 es el 9 de octubre de 2026).
- referencia: el número de referencia/operación tal como aparece, solo dígitos.
- banco: banco emisor o receptor que se lea en el comprobante.
- metodo: "pago_movil" si dice pago móvil; "transferencia_bs" si es transferencia en bolívares; "zelle" si es Zelle; "otro" si no se sabe.
- emisor_nombre y emisor_cedula: quién envió el dinero, solo si aparece en el comprobante (cédula solo dígitos).
- descripcion: el texto libre que quien transfirió escribió como concepto o descripción de la operación (por ejemplo "Pago Daniela Bermudez", "mensualidad octubre"). Suele traer el nombre del niño o de la familia. Cópialo tal cual; null si no hay.
- Si el comprobante muestra que la cuenta del colegio ("U E P Colegio Araguaney") es la que ENVÍA el dinero y no la que lo recibe, no es un pago recibido: explícalo en observaciones.
- De la nota de texto, si existe: alumno_en_nota es el nombre del niño o de la familia que se menciona; mes_en_nota es el mes que se menciona (por ejemplo "octubre"). Si la nota no dice algo, null.
- Nunca inventes datos. Si un número es ilegible, pon null y dilo en observaciones.`;

export type ResultadoLectura = { lectura: Lectura } | { error: string };

export async function leerCapture(
  archivo: { buffer: ArrayBuffer; contentType: string },
  nota: string,
): Promise<ResultadoLectura> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { error: "Falta configurar OPENAI_API_KEY para leer comprobantes." };
  }

  if (!["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"].includes(archivo.contentType)) {
    return { error: "Formato no compatible. Envía una imagen JPG, PNG, WEBP, GIF o un PDF." };
  }

  // El webhook dispone de 60 s en total: reservar tiempo para guardar la
  // lectura y responder por Telegram, sin reintentos que agoten ese plazo.
  const client = new OpenAI({ apiKey, timeout: 40_000, maxRetries: 0 });
  const datos = Buffer.from(archivo.buffer).toString("base64");

  const contenidoArchivo: OpenAI.Responses.ResponseInputContent =
    archivo.contentType === "application/pdf"
      ? { type: "input_file", filename: "comprobante.pdf", file_data: `data:application/pdf;base64,${datos}` }
      : {
          type: "input_image",
          image_url: `data:${archivo.contentType};base64,${datos}`,
          detail: "high",
        };

  try {
    const respuesta = await client.responses.parse({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-terra",
      max_output_tokens: 4000,
      instructions: SISTEMA,
      reasoning: { effort: "low" },
      store: false,
      text: { format: zodTextFormat(LecturaSchema, "lectura_comprobante") },
      input: [
        {
          role: "user",
          content: [
            contenidoArchivo,
            {
              type: "input_text",
              text: nota.trim()
                ? `Nota de quien lo reenvía: "${nota.trim()}"`
                : "Sin nota de texto.",
            },
          ],
        },
      ],
    });

    if (respuesta.output.some((item) => item.type === "message" && item.content.some((parte) => parte.type === "refusal"))) {
      return { error: "La IA no pudo procesar ese comprobante. Revísalo manualmente." };
    }
    if (respuesta.status !== "completed" || !respuesta.output_parsed) {
      return { error: "La IA no devolvió una lectura válida." };
    }
    return { lectura: LecturaSchema.parse(respuesta.output_parsed) };
  } catch (error) {
    // No reenviar mensajes crudos del proveedor: podrían incluir datos del pedido.
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) return { error: "La clave de OpenAI no es válida. Revisa OPENAI_API_KEY." };
      if (error.status === 429) return { error: "OpenAI no pudo procesar la lectura por saldo o límite de uso. Revisa la cuenta e inténtalo de nuevo." };
      if (error.status === 403 || error.status === 404) return { error: "OpenAI no permite acceder al modelo configurado. Revisa OPENAI_MODEL y los permisos del proyecto." };
      return { error: "No se pudo conectar o procesar el comprobante con OpenAI. Inténtalo de nuevo o revísalo manualmente." };
    }
    return { error: "No se pudo leer el capture." };
  }
}
