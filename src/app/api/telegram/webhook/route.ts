import { after } from "next/server";
import { procesarUpdate, type TgUpdate } from "@/lib/telegram-bandeja";
import { secretoValido } from "@/lib/telegram";

// Leer el capture con la IA tarda varios segundos: se responde 200 a Telegram
// de inmediato y el trabajo sigue en `after`, para que no reintente el envío.
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!secretoValido(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return new Response("forbidden", { status: 403 });
  }

  let update: TgUpdate;
  try {
    update = (await request.json()) as TgUpdate;
  } catch {
    return new Response("bad request", { status: 400 });
  }

  after(async () => {
    try {
      await procesarUpdate(update);
    } catch (error) {
      console.error("telegram webhook:", error);
    }
  });

  return Response.json({ ok: true });
}
