import "server-only";
import { createClient } from "@/lib/supabase/server";

export type FiltroPagos = {
  desde: string;
  hasta: string;
  metodo?: string;
  moneda?: "BS" | "USD";
  q?: string;
  sinFactura?: boolean;
  incluirAnulados?: boolean;
  incluirHistorial?: boolean;
};

export type FilaPago = {
  id: string;
  numero_recibo: number;
  fecha_pago: string;
  anulado: boolean;
  es_historial: boolean;
  alumno: string;
  aula: string;
  facturar_a: string;
  facturar_cedula: string;
  moneda: "BS" | "USD";
  metodo: string;
  banco: string;
  referencia: string;
  // Monto exacto en bolívares (solo si se pagó en Bs) y tasa del BCV con que se convirtió.
  monto_bs: number | null;
  tasa: number;
  monto_usd: number;
  conceptos: string;
  factura_numero: string;
  factura_control: string;
  registrado_por: string;
  comprobante_url: string | null;
};

const METODOS_EN_USD = new Set(["efectivo_usd", "zelle"]);

const uno = <T,>(x: T | T[] | null | undefined): T | null =>
  Array.isArray(x) ? (x[0] ?? null) : (x ?? null);

type FilaCruda = {
  id: string;
  numero_recibo: number;
  fecha_pago: string;
  anulado: boolean;
  es_historial: boolean;
  concepto_libre: string | null;
  metodo: string;
  moneda_pago: "BS" | "USD" | null;
  banco: string | null;
  referencia: string | null;
  monto_usd_total: number | string;
  monto_bs_total: number | string;
  monto_bs_pagado: number | string | null;
  tasa_bcv_valor: number | string;
  factura_nombre: string | null;
  factura_cedula: string | null;
  factura_numero: string | null;
  factura_control: string | null;
  registrado_por_nombre: string | null;
  comprobante_url: string | null;
  perfil: { nombre_completo: string } | { nombre_completo: string }[] | null;
  matricula:
    | {
        alumno: { nombre: string; apellido: string } | { nombre: string; apellido: string }[] | null;
        aula: { nombre: string } | { nombre: string }[] | null;
      }
    | {
        alumno: { nombre: string; apellido: string } | { nombre: string; apellido: string }[] | null;
        aula: { nombre: string } | { nombre: string }[] | null;
      }[]
    | null;
  aplicaciones: { plan_item: { descripcion: string } | { descripcion: string }[] | null }[] | null;
};

const plano = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Pagos del período con quién pagó, cuándo, cómo y a quién se factura. Se lee
 * de `pagos` (el registro único), así que incluye los que entraron por
 * Telegram, por el formulario público o cargados a mano.
 */
export async function getReportePagos(f: FiltroPagos): Promise<FilaPago[]> {
  const supabase = await createClient();

  let consulta = supabase
    .from("pagos")
    .select(
      `id, numero_recibo, fecha_pago, anulado, es_historial, concepto_libre, metodo, moneda_pago, banco, referencia,
       monto_usd_total, monto_bs_total, monto_bs_pagado, tasa_bcv_valor,
       factura_nombre, factura_cedula, factura_numero, factura_control,
       registrado_por_nombre, comprobante_url,
       perfil:perfiles(nombre_completo),
       matricula:matriculas(alumno:alumnos(nombre, apellido), aula:aulas(nombre)),
       aplicaciones:pago_aplicaciones(plan_item:plan_pago_items(descripcion))`,
    )
    .gte("fecha_pago", f.desde)
    .lte("fecha_pago", f.hasta)
    .order("fecha_pago", { ascending: false })
    .order("creado_en", { ascending: false })
    .limit(2000);

  if (!f.incluirAnulados) consulta = consulta.eq("anulado", false);
  // Los meses que se dan por pagados no son dinero recibido: se ocultan salvo que se pidan.
  if (!f.incluirHistorial) consulta = consulta.eq("es_historial", false);
  if (f.metodo) consulta = consulta.eq("metodo", f.metodo);

  const { data } = await consulta;

  let filas: FilaPago[] = ((data ?? []) as unknown as FilaCruda[]).map((p) => {
    const m = uno(p.matricula);
    const alumno = uno(m?.alumno);
    // Pagos anteriores a la migración 0003 no traen moneda: se deduce del método.
    const moneda: "BS" | "USD" = p.moneda_pago ?? (METODOS_EN_USD.has(p.metodo) ? "USD" : "BS");
    return {
      id: p.id,
      numero_recibo: p.numero_recibo,
      fecha_pago: p.fecha_pago,
      anulado: p.anulado,
      es_historial: p.es_historial,
      alumno: alumno ? `${alumno.apellido} ${alumno.nombre}`.replace(/\s+/g, " ").trim() : "",
      aula: uno(m?.aula)?.nombre ?? "",
      facturar_a: p.factura_nombre ?? "",
      facturar_cedula: p.factura_cedula ?? "",
      moneda,
      metodo: p.metodo,
      banco: p.banco ?? "",
      referencia: p.referencia ?? "",
      monto_bs: moneda === "BS" ? Number(p.monto_bs_pagado ?? p.monto_bs_total) : null,
      tasa: Number(p.tasa_bcv_valor),
      monto_usd: Number(p.monto_usd_total),
      conceptos:
        (p.aplicaciones ?? [])
          .map((a) => uno(a.plan_item)?.descripcion ?? "")
          .filter(Boolean)
          .join(" + ") ||
        p.concepto_libre ||
        "",
      factura_numero: p.factura_numero ?? "",
      factura_control: p.factura_control ?? "",
      registrado_por: uno(p.perfil)?.nombre_completo ?? p.registrado_por_nombre ?? "",
      comprobante_url: p.comprobante_url,
    };
  });

  if (f.moneda) filas = filas.filter((p) => p.moneda === f.moneda);
  if (f.sinFactura) filas = filas.filter((p) => !p.factura_numero);
  if (f.q?.trim()) {
    const terminos = plano(f.q).split(/\s+/).filter(Boolean);
    filas = filas.filter((p) => {
      const texto = plano(`${p.alumno} ${p.facturar_a} ${p.facturar_cedula} ${p.referencia} ${p.banco}`);
      return terminos.every((t) => texto.includes(t));
    });
  }

  return filas;
}

export type TotalesPagos = {
  cantidad: number;
  sinFactura: number;
  bsRecibido: number;
  bsEnUsd: number;
  usdRecibido: number;
};

export function totalesPagos(filas: FilaPago[]): TotalesPagos {
  const validas = filas.filter((f) => !f.anulado && !f.es_historial);
  const enBs = validas.filter((f) => f.moneda === "BS");
  return {
    cantidad: validas.length,
    sinFactura: validas.filter((f) => !f.factura_numero).length,
    bsRecibido: enBs.reduce((a, f) => a + (f.monto_bs ?? 0), 0),
    bsEnUsd: enBs.reduce((a, f) => a + f.monto_usd, 0),
    usdRecibido: validas.filter((f) => f.moneda === "USD").reduce((a, f) => a + f.monto_usd, 0),
  };
}

// Lee los filtros de la URL (pantalla y exportación usan los mismos).
export function filtroDesdeParams(
  p: Record<string, string | undefined>,
  hoy: string,
): FiltroPagos {
  const primerDiaMes = `${hoy.slice(0, 8)}01`;
  return {
    desde: p.desde || primerDiaMes,
    hasta: p.hasta || hoy,
    metodo: p.metodo || undefined,
    moneda: p.moneda === "BS" || p.moneda === "USD" ? p.moneda : undefined,
    q: p.q || undefined,
    sinFactura: p.sin_factura === "1",
    incluirAnulados: p.anulados === "1",
    incluirHistorial: p.historial === "1",
  };
}
