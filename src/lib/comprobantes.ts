import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "comprobantes-pago";

export async function subirComprobante(file: File): Promise<{ url: string } | { error: string }> {
  const admin = createAdminClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const nombreArchivo = `${crypto.randomUUID()}.${ext}`;

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(nombreArchivo, await file.arrayBuffer(), {
      contentType: file.type || "image/jpeg",
    });

  if (error) return { error: `No se pudo subir el comprobante: ${error.message}` };

  const { data } = admin.storage.from(BUCKET).getPublicUrl(nombreArchivo);
  return { url: data.publicUrl };
}
