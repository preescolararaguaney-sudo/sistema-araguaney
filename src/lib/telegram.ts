import "server-only";
import { timingSafeEqual } from "node:crypto";

const API = "https://api.telegram.org";

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("Falta la variable TELEGRAM_BOT_TOKEN");
  return t;
}

// El webhook se registra con un "secret_token" que Telegram devuelve en la
// cabecera X-Telegram-Bot-Api-Secret-Token en cada llamada: es lo único que
// distingue una llamada real de Telegram de cualquiera que adivine la URL.
export function secretoValido(cabecera: string | null): boolean {
  const esperado = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!esperado || !cabecera) return false;
  const a = Buffer.from(cabecera);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

// IDs de Telegram (separados por coma) autorizados a mandar capture.
export function usuariosAutorizados(): Set<number> {
  return new Set(
    (process.env.TELEGRAM_ALLOWED_USER_IDS ?? "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n !== 0),
  );
}

export async function enviarMensaje(
  chatId: number,
  texto: string,
  responderA?: number,
): Promise<number | null> {
  const res = await fetch(`${API}/bot${token()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: texto,
      ...(responderA ? { reply_parameters: { message_id: responderA } } : {}),
      link_preview_options: { is_disabled: true },
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { result?: { message_id?: number } };
  return data.result?.message_id ?? null;
}

export type ArchivoDescargado = {
  buffer: ArrayBuffer;
  contentType: string;
  extension: string;
};

export async function descargarArchivo(
  fileId: string,
): Promise<ArchivoDescargado | { error: string }> {
  const info = await fetch(`${API}/bot${token()}/getFile?file_id=${encodeURIComponent(fileId)}`);
  if (!info.ok) return { error: "Telegram no devolvió el archivo." };
  const meta = (await info.json()) as { result?: { file_path?: string } };
  const ruta = meta.result?.file_path;
  if (!ruta) return { error: "Telegram no devolvió la ruta del archivo." };

  const res = await fetch(`${API}/file/bot${token()}/${ruta}`);
  if (!res.ok) return { error: "No se pudo descargar el archivo de Telegram." };

  const extension = ruta.split(".").pop()?.toLowerCase() || "jpg";
  const tipos: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    pdf: "application/pdf",
  };
  return {
    buffer: await res.arrayBuffer(),
    contentType: tipos[extension] ?? "image/jpeg",
    extension,
  };
}
