import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
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
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "Falta la variable ANTHROPIC_API_KEY." };
  }

  const client = new Anthropic();
  const datos = Buffer.from(archivo.buffer).toString("base64");

  const contenidoArchivo: Anthropic.ContentBlockParam =
    archivo.contentType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: datos } }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: archivo.contentType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
            data: datos,
          },
        };

  try {
    const respuesta = await client.messages.parse({
      model: process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5",
      max_tokens: 4000,
      system: SISTEMA,
      output_config: { effort: "low", format: zodOutputFormat(LecturaSchema) },
      messages: [
        {
          role: "user",
          content: [
            contenidoArchivo,
            {
              type: "text",
              text: nota.trim()
                ? `Nota de quien lo reenvía: "${nota.trim()}"`
                : "Sin nota de texto.",
            },
          ],
        },
      ],
    });

    if (respuesta.stop_reason === "refusal") {
      return { error: "La IA no quiso procesar esa imagen." };
    }
    if (!respuesta.parsed_output) {
      return { error: "La IA no devolvió una lectura válida." };
    }
    return { lectura: respuesta.parsed_output };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return { error: `Error de la API de IA (${error.status}): ${error.message}` };
    }
    return { error: "No se pudo leer el capture." };
  }
}
