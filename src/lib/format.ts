// Reglas de fechas de este proyecto (para no repetir el bug de serialización
// ya sufrido antes):
//
// - Las columnas DATE de Postgres (vencimientos, fecha_nacimiento, etc.) son
//   fechas de calendario puras, SIN hora ni zona horaria. Nunca se envuelven
//   en `new Date(...)` para formatearlas: eso las reinterpreta en la zona
//   horaria de quien ejecuta el código (el navegador del usuario o el
//   servidor) y puede correr el día. Se formatean con string-splitting.
// - Los TIMESTAMPTZ (creado_en, bitácora) sí representan un instante real,
//   así que esos sí se convierten a America/Caracas para mostrarse.
// - <input type="date"> ya usa el formato "YYYY-MM-DD": se pasa tal cual,
//   sin pasar por Date.

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "2026-09-10" -> "10/09/2026" */
export function formatFecha(fechaIso: string): string {
  const [year, month, day] = fechaIso.split("-");
  return `${day}/${month}/${year}`;
}

/** "2026-09-01" -> "Septiembre 2026" */
export function formatMesAnio(fechaIso: string): string {
  const [year, month] = fechaIso.split("-").map(Number);
  const nombre = MESES[month - 1];
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${year}`;
}

/** Timestamptz (instante real) -> fecha y hora en America/Caracas */
export function formatFechaHora(timestamp: string): string {
  return new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

/** Fecha de hoy en America/Caracas como "YYYY-MM-DD" (para <input type="date">) */
export function hoyCaracas(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatUsd(monto: number): string {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(monto);
}

export const METODO_PAGO_LABEL: Record<string, string> = {
  transferencia_bs: "Transferencia en Bs",
  pago_movil: "Pago móvil",
  efectivo_bs: "Efectivo en Bs",
  efectivo_usd: "Efectivo en USD",
  zelle: "Zelle",
  otro: "Otro",
};

export function formatBs(monto: number): string {
  return (
    new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(monto) + " Bs"
  );
}
