import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { getConceptosDePago, getPagosPendientes } from "@/lib/queries/bandeja";
import { FichaFactura } from "../ficha-factura";
import { PrintBoton } from "../print-boton";

export default async function FichasPage({
  searchParams,
}: {
  searchParams: Promise<{ todas?: string }>;
}) {
  await requireRol(["directora", "administracion"]);
  const { todas } = await searchParams;

  // Por defecto, solo los pagos aprobados que todavía no tienen número de factura.
  const aprobados = await getPagosPendientes("aprobado");
  const pagos = aprobados
    .filter((p) => todas === "1" || !p.factura_numero)
    .sort((a, b) => a.creado_en.localeCompare(b.creado_en));

  const conceptos = await Promise.all(
    pagos.map(async (p) => (p.pago_id ? (await getConceptosDePago(p.pago_id)).map((c) => c.descripcion) : [])),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link href="/cobranza/bandeja" className="text-xs text-stone-500 hover:underline">
            ← Volver a la bandeja
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-stone-900">Fichas para factura</h1>
          <p className="text-sm text-stone-600">
            {todas === "1" ? "Todos los pagos aprobados" : "Pagos aprobados que aún no tienen número de factura"}:{" "}
            {pagos.length}.{" "}
            <Link href={todas === "1" ? "/cobranza/bandeja/fichas" : "/cobranza/bandeja/fichas?todas=1"} className="text-emerald-700 underline">
              {todas === "1" ? "Ver solo las pendientes" : "Ver todas"}
            </Link>
          </p>
        </div>
        {pagos.length > 0 && <PrintBoton texto="Imprimir todas" />}
      </div>

      {pagos.length === 0 && (
        <p className="rounded-xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-500 print:hidden">
          No hay fichas pendientes.
        </p>
      )}

      {pagos.map((p, i) => (
        <div key={p.id} className="print:break-after-page">
          <FichaFactura pago={p} conceptos={conceptos[i]} />
          <p className="mt-1 text-center print:hidden">
            <Link href={`/cobranza/bandeja/${p.id}`} className="text-xs text-emerald-700 hover:underline">
              Abrir este pago para anotar el n.º de factura
            </Link>
          </p>
        </div>
      ))}
    </div>
  );
}
