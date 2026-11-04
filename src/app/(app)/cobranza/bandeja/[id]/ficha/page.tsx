import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { getPagoPendiente } from "@/lib/queries/bandeja";
import { datosFicha } from "../../datos-ficha";
import { FichaFactura } from "../../ficha-factura";
import { PrintBoton } from "../../print-boton";

export default async function FichaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRol(["directora", "administracion"]);
  const { id } = await params;

  const pago = await getPagoPendiente(id);
  // La ficha sirve para pagos por aprobar y aprobados; no para rechazados ni duplicados.
  if (!pago || (pago.estado !== "aprobado" && pago.estado !== "pendiente")) notFound();

  const { conceptos, tasa } = await datosFicha(pago);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/cobranza/bandeja/${id}`} className="text-xs text-stone-500 hover:underline">
          ← Volver al pago
        </Link>
        <PrintBoton texto="Imprimir ficha" />
      </div>
      {pago.estado === "pendiente" && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 print:hidden">
          Este pago aún no está aprobado: el concepto y los datos de factura son los sugeridos y pueden cambiar.
        </p>
      )}
      <FichaFactura pago={pago} conceptos={conceptos} tasa={tasa} />
    </div>
  );
}
