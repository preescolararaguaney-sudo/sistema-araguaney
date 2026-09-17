import "server-only";
import ExcelJS from "exceljs";

export type HojaExcel = {
  nombre: string;
  columnas: string[];
  filas: (string | number)[][];
};

// Nombres de hoja en Excel: máx 31 caracteres, sin  \ / ? * [ ]
function sanitizarNombreHoja(nombre: string): string {
  return nombre.replace(/[\\/?*[\]]/g, "-").slice(0, 31) || "Hoja";
}

export async function buildWorkbookPorAula(hojas: HojaExcel[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  for (const hoja of hojas) {
    const sheet = workbook.addWorksheet(sanitizarNombreHoja(hoja.nombre));
    sheet.addRow(hoja.columnas).font = { bold: true };
    for (const fila of hoja.filas) {
      sheet.addRow(fila);
    }
    sheet.columns.forEach((col) => {
      col.width = 22;
    });
  }

  if (hojas.length === 0) {
    workbook.addWorksheet("Sin datos");
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function xlsxResponse(buffer: Buffer, nombreArchivo: string): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  });
}
