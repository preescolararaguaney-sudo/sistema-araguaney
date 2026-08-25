import type { CuotaPlan } from "@/lib/queries/matriculas";
import { formatFecha, formatMesAnio, formatUsd, hoyCaracas } from "@/lib/format";

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  pagado: "Pagado",
};

function badgeClase(cuota: CuotaPlan, hoy: string) {
  if (cuota.estado === "pagado") return "bg-emerald-50 text-emerald-700";
  if (cuota.fecha_vencimiento < hoy) return "bg-red-50 text-red-700";
  if (cuota.estado === "parcial") return "bg-amber-50 text-amber-700";
  return "bg-stone-100 text-stone-600";
}

function etiqueta(cuota: CuotaPlan, hoy: string) {
  if (cuota.estado === "pagado") return "Pagado";
  if (cuota.fecha_vencimiento < hoy) return "Vencido";
  return ESTADO_LABEL[cuota.estado];
}

/** Agrupa las 3 partes de la mensualidad de agosto bajo un mismo título. */
function agruparAgosto(cuotas: CuotaPlan[]) {
  const grupos: { titulo: string; items: CuotaPlan[] }[] = [];
  const agostoPorMes = new Map<string, CuotaPlan[]>();

  for (const c of cuotas) {
    if (c.tipo === "mensualidad_agosto" && c.mes_referencia) {
      const key = c.mes_referencia;
      if (!agostoPorMes.has(key)) agostoPorMes.set(key, []);
      agostoPorMes.get(key)!.push(c);
    } else {
      grupos.push({ titulo: c.descripcion, items: [c] });
    }
  }

  for (const [mes, items] of agostoPorMes) {
    grupos.push({
      titulo: `Mensualidad de Agosto (${formatMesAnio(mes)}) — 3 partes`,
      items: items.sort((a, b) => (a.parte_numero ?? 0) - (b.parte_numero ?? 0)),
    });
  }

  return grupos;
}

export function TablaCuotas({ cuotas }: { cuotas: CuotaPlan[] }) {
  const hoy = hoyCaracas();
  const grupos = agruparAgosto(cuotas);

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
            <th className="px-4 py-2 font-medium">Concepto</th>
            <th className="px-4 py-2 font-medium">Vence</th>
            <th className="px-4 py-2 font-medium">Monto</th>
            <th className="px-4 py-2 font-medium">Pagado</th>
            <th className="px-4 py-2 font-medium">Saldo</th>
            <th className="px-4 py-2 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {grupos.map((g, gi) => (
            <FragmentoGrupo key={gi} titulo={g.titulo} items={g.items} hoy={hoy} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FragmentoGrupo({
  titulo,
  items,
  hoy,
}: {
  titulo: string;
  items: CuotaPlan[];
  hoy: string;
}) {
  return (
    <>
      {items.length > 1 && (
        <tr className="bg-stone-50">
          <td colSpan={6} className="px-4 py-1 text-xs font-medium text-stone-500">
            {titulo}
          </td>
        </tr>
      )}
      {items.map((c) => (
        <tr key={c.id} className="border-b border-stone-100 last:border-0">
          <td className="px-4 py-2">
            {items.length > 1 ? `Parte ${c.parte_numero}/3` : c.descripcion}
          </td>
          <td className="px-4 py-2">{formatFecha(c.fecha_vencimiento)}</td>
          <td className="px-4 py-2">{formatUsd(c.monto_usd)}</td>
          <td className="px-4 py-2">{formatUsd(c.monto_usd_pagado)}</td>
          <td className="px-4 py-2 font-medium">
            {formatUsd(c.monto_usd - c.monto_usd_pagado)}
          </td>
          <td className="px-4 py-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClase(c, hoy)}`}>
              {etiqueta(c, hoy)}
            </span>
          </td>
        </tr>
      ))}
    </>
  );
}
