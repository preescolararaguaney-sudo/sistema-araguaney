function escapeCsvCell(valor: string): string {
  if (/[",\n;]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

export function toCsv(filas: (string | number)[][]): string {
  // BOM UTF-8 al inicio: sin esto, Excel en Windows abre acentos/ñ corruptos.
  const bom = "﻿";
  const contenido = filas
    .map((fila) => fila.map((celda) => escapeCsvCell(String(celda))).join(";"))
    .join("\r\n");
  return bom + contenido;
}

export function csvResponse(filas: (string | number)[][], nombreArchivo: string): Response {
  return new Response(toCsv(filas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  });
}
