import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { getPagosPendientes } from "@/lib/queries/bandeja";
import { formatBs, formatFecha, formatFechaHora } from "@/lib/format";

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Por aprobar",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  duplicado: "Duplicado",
};

const ESTADO_CLASE: Record<string, string> = {
  pendiente: "bg-amber-50 text-amber-800",
  aprobado: "bg-emerald-50 text-emerald-700",
  rechazado: "bg-stone-100 text-stone-600",
  duplicado: "bg-red-50 text-red-700",
};

export default async function BandejaPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  await requireRol(["directora", "administracion"]);
  const { estado: estadoParam } = await searchParams;
  const estado = estadoParam ?? "pendiente";

  const pagos = await getPagosPendientes(estado === "todos" ? "" : estado);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-stone-900">Bandeja de pagos</h1>
        <p className="mt-1 text-sm text-stone-600">
          Capture recibidos por el bot de Telegram, ya leídos. Revisa cada uno y apruébalo para
          registrar el pago y preparar los datos de la factura.
        </p>
      </div>

      <form method="get" className="flex items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Estado</span>
          <select
            name="estado"
            defaultValue={estado}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          >
            <option value="pendiente">Por aprobar</option>
            <option value="aprobado">Aprobados</option>
            <option value="duplicado">Duplicados</option>
            <option value="rechazado">Rechazados</option>
            <option value="todos">Todos</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
        >
          Filtrar
        </button>
        <Link
          href="/cobranza/bandeja/fichas"
          className="ml-auto rounded-md border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
        >
          Fichas para factura
        </Link>
      </form>

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="px-4 py-2 font-medium">Recibido</th>
              <th className="px-4 py-2 font-medium">Monto</th>
              <th className="px-4 py-2 font-medium">Alumno</th>
              <th className="px-4 py-2 font-medium">Fecha / referencia</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((p) => (
              <tr key={p.id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-2">{formatFechaHora(p.creado_en)}</td>
                <td className="px-4 py-2 font-medium">{p.monto_bs != null ? formatBs(p.monto_bs) : "—"}</td>
                <td className="px-4 py-2">
                  {p.alumno_nombre ? (
                    <>
                      {p.alumno_nombre}
                      <span className="ml-1 text-xs text-stone-500">{p.aula_nombre}</span>
                    </>
                  ) : (
                    <span className="text-amber-700">Sin identificar{p.nota ? ` — “${p.nota}”` : ""}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-stone-600">
                  {p.fecha_pago ? formatFecha(p.fecha_pago) : "—"}
                  {p.referencia ? ` · ${p.referencia}` : ""}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_CLASE[p.estado]}`}>
                    {ESTADO_LABEL[p.estado]}
                  </span>
                  {p.estado === "pendiente" && (!p.factura_nombre || !p.factura_cedula) && (
                    <span className="ml-1 text-xs text-amber-700">faltan datos de factura</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <Link href={`/cobranza/bandeja/${p.id}`} className="text-emerald-700 hover:underline">
                    {p.estado === "pendiente" ? "Revisar" : "Ver"}
                  </Link>
                </td>
              </tr>
            ))}
            {pagos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-3 text-center text-stone-500">
                  No hay pagos en esta vista.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
