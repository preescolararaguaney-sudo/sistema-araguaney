import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { getConceptosDePago, getPagoPendiente } from "@/lib/queries/bandeja";
import { FichaFactura } from "../../ficha-factura";
import { PrintBoton } from "../../print-boton";

export default async function FichaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRol(["directora", "administracion"]);
  const { id } = await params;

  const pago = await getPagoPendiente(id);
  if (!pago || pago.estado !== "aprobado") notFound();

  const conceptos = pago.pago_id ? await getConceptosDePago(pago.pago_id) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/cobranza/bandeja/${id}`} className="text-xs text-stone-500 hover:underline">
          ← Volver al pago
        </Link>
        <PrintBoton texto="Imprimir ficha" />
      </div>
      <FichaFactura pago={pago} conceptos={conceptos.map((c) => c.descripcion)} />
    </div>
  );
}
