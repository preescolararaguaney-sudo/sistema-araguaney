import { requireRol } from "@/lib/auth";
import { filtroDesdeParams, getReportePagos, totalesPagos } from "@/lib/queries/reporte-pagos";
import { buildWorkbookPorAula, xlsxResponse } from "@/lib/xlsx";
import { hoyCaracas, formatFecha, METODO_PAGO_LABEL } from "@/lib/format";

export async function GET(request: Request) {
  await requireRol(["directora", "administracion"]);

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const filtro = filtroDesdeParams(params, hoyCaracas());
  const filas = await getReportePagos(filtro);
  const totales = totalesPagos(filas);

  const buffer = await buildWorkbookPorAula([
    {
      nombre: "Pagos",
      columnas: [
        "Fecha",
        "Recibo",
        "Alumno",
        "Aula",
        "Facturar a",
        "Cédula / RIF",
        "Moneda",
        "Método",
        "Banco",
        "Referencia",
        "Monto Bs",
        "Tasa BCV",
        "Monto USD",
        "Concepto",
        "N.º factura",
        "N.º control",
        "Registrado por",
        "Anulado",
      ],
      filas: filas.map((p) => [
        formatFecha(p.fecha_pago),
        p.numero_recibo,
        p.alumno,
        p.aula,
        p.facturar_a,
        p.facturar_cedula,
        p.moneda === "BS" ? "Bs" : "USD",
        METODO_PAGO_LABEL[p.metodo] ?? p.metodo,
        p.banco,
        p.referencia,
        p.monto_bs ?? "",
        p.moneda === "BS" ? p.tasa : "",
        p.monto_usd,
        p.conceptos,
        p.factura_numero,
        p.factura_control,
        p.registrado_por,
        p.anulado ? "Sí" : "",
      ]),
    },
    {
      nombre: "Resumen",
      columnas: ["Concepto", "Valor"],
      filas: [
        ["Desde", formatFecha(filtro.desde)],
        ["Hasta", formatFecha(filtro.hasta)],
        ["Pagos (sin anulados)", totales.cantidad],
        ["Recibido en bolívares (Bs)", Math.round(totales.bsRecibido * 100) / 100],
        ["Equivalente de esos Bs en USD (al BCV de cada día)", Math.round(totales.bsEnUsd * 100) / 100],
        ["Recibido en dólares (USD)", Math.round(totales.usdRecibido * 100) / 100],
        ["Pagos sin n.º de factura", totales.sinFactura],
      ],
    },
  ]);

  return xlsxResponse(buffer, `pagos_${filtro.desde}_a_${filtro.hasta}.xlsx`);
}
