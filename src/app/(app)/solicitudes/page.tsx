import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { getSolicitudes } from "@/lib/queries/solicitudes";
import { formatFechaHora } from "@/lib/format";

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

export default async function SolicitudesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  await requireRol(["directora", "administracion"]);
  const { estado: estadoParam } = await searchParams;
  const estado = estadoParam ?? "pendiente";

  const solicitudes = await getSolicitudes(estado === "todas" ? "" : estado);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-stone-900">
          Solicitudes de inscripción
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Enviadas desde el formulario público por los representantes.
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
            <option value="pendiente">Pendientes</option>
            <option value="aprobada">Aprobadas</option>
            <option value="rechazada">Rechazadas</option>
            <option value="todas">Todas</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
        >
          Filtrar
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="px-4 py-2 font-medium">Alumno</th>
              <th className="px-4 py-2 font-medium">Representante</th>
              <th className="px-4 py-2 font-medium">Enviada</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.map((s) => (
              <tr key={s.id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-2">{s.alumno_nombre} {s.alumno_apellido}</td>
                <td className="px-4 py-2">{s.representante_nombre} {s.representante_apellido}</td>
                <td className="px-4 py-2">{formatFechaHora(s.creado_en)}</td>
                <td className="px-4 py-2">{ESTADO_LABEL[s.estado] ?? s.estado}</td>
                <td className="px-4 py-2">
                  <Link href={`/solicitudes/${s.id}`} className="text-emerald-700 hover:underline">
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
            {solicitudes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-center text-stone-500">
                  Sin solicitudes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
