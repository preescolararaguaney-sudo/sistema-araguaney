import { NextRequest } from "next/server";
import { requireRol } from "@/lib/auth";
import { getCierreMes } from "@/lib/queries/cierre";
import { csvResponse } from "@/lib/csv";
import { hoyCaracas, METODO_PAGO_LABEL } from "@/lib/format";

export async function GET(request: NextRequest) {
  await requireRol(["directora", "administracion"]);
  const mes = request.nextUrl.searchParams.get("mes") ?? hoyCaracas().slice(0, 7);
  const cierre = await getCierreMes(mes);

  const filas = [
    ["Método de pago", "Cantidad", "Total USD", "Total Bs"],
    ...cierre.porMetodo.map((m) => [
      METODO_PAGO_LABEL[m.metodo] ?? m.metodo,
      m.cantidad,
      m.total_usd.toFixed(2),
      m.total_bs.toFixed(2),
    ]),
    ["Total", cierre.cantidadPagos, cierre.totalUsd.toFixed(2), cierre.totalBs.toFixed(2)],
  ];

  return csvResponse(filas, `cierre_${mes}.csv`);
}
