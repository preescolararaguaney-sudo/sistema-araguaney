import type { PagoPendiente } from "@/lib/queries/bandeja";
import { formatBs, formatFecha } from "@/lib/format";

function Campo({ etiqueta, valor, grande = true }: { etiqueta: string; valor?: string | null; grande?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-medium uppercase tracking-wide text-stone-500">{etiqueta}</span>
      {valor ? (
        <span className={`font-bold text-stone-900 ${grande ? "text-xl" : "text-base"}`}>{valor}</span>
      ) : (
        <span className="mt-4 border-b border-stone-900" />
      )}
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="bg-stone-900 px-2 py-1 text-xs font-bold tracking-wide text-white">{titulo}</h2>
      {children}
    </section>
  );
}

/**
 * Ficha de un pago aprobado con los datos en el orden en que se copian al
 * talonario de factura. Lo que falta queda como una línea para escribir a mano.
 */
export function FichaFactura({
  pago,
  conceptos,
}: {
  pago: PagoPendiente;
  conceptos: string[];
}) {
  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-5 border-2 border-stone-900 bg-white p-6 print:break-inside-avoid print:border-2">
      <header className="flex items-baseline justify-between bg-stone-100 px-3 py-2">
        <h1 className="text-lg font-bold text-stone-900">FICHA PARA FACTURA</h1>
        <span className="text-xs text-stone-500">Preescolar Araguaney</span>
      </header>

      <Seccion titulo="FACTURAR A">
        <Campo etiqueta="Nombre o razón social" valor={pago.factura_nombre} />
        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Cédula / RIF" valor={pago.factura_cedula} />
          <Campo etiqueta="Teléfono" valor={pago.factura_telefono} />
        </div>
        <Campo etiqueta="Domicilio (si lo piden)" valor={pago.factura_direccion} grande={false} />
      </Seccion>

      <Seccion titulo="ALUMNO">
        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Alumno" valor={pago.alumno_nombre} />
          <Campo etiqueta="Aula" valor={pago.aula_nombre} />
        </div>
      </Seccion>

      <Seccion titulo="PAGO RECIBIDO">
        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Monto en Bs" valor={pago.monto_bs != null ? formatBs(pago.monto_bs) : null} />
          <Campo etiqueta="Fecha de la transferencia" valor={pago.fecha_pago ? formatFecha(pago.fecha_pago) : null} />
          <Campo etiqueta="N.º de referencia" valor={pago.referencia} />
          <Campo etiqueta="Banco" valor={pago.banco} />
        </div>
      </Seccion>

      <Seccion titulo="CONCEPTO A ESCRIBIR EN LA FACTURA">
        <p className="text-lg font-bold text-stone-900">
          {conceptos.length > 0 ? conceptos.join(" + ") : "________________________"}
        </p>
      </Seccion>

      <footer className="flex flex-wrap items-end gap-6 border-t border-stone-300 pt-3 text-[10px] font-medium uppercase tracking-wide text-stone-500">
        <span className="flex items-end gap-2">
          N.º factura
          <span className="inline-block w-32 border-b border-stone-900 text-sm normal-case text-stone-900">
            {pago.factura_numero}
          </span>
        </span>
        <span className="flex items-end gap-2">
          N.º control
          <span className="inline-block w-32 border-b border-stone-900 text-sm normal-case text-stone-900">
            {pago.factura_control}
          </span>
        </span>
      </footer>
    </article>
  );
}
