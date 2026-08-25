import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hoyCaracas } from "@/lib/format";

export type Periodo = {
  id: string;
  anio: number;
  mes: number;
  quincena: 1 | 2;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
};

function ultimoDiaMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/** Determina a qué período (año/mes/quincena) pertenece una fecha "YYYY-MM-DD". */
export function periodoDeFecha(fechaIso: string): { anio: number; mes: number; quincena: 1 | 2; fecha_inicio: string; fecha_fin: string } {
  const [anio, mes, dia] = fechaIso.split("-").map(Number);
  const mesStr = String(mes).padStart(2, "0");
  if (dia <= 15) {
    return { anio, mes, quincena: 1, fecha_inicio: `${anio}-${mesStr}-01`, fecha_fin: `${anio}-${mesStr}-15` };
  }
  const ultimo = ultimoDiaMes(anio, mes);
  return { anio, mes, quincena: 2, fecha_inicio: `${anio}-${mesStr}-16`, fecha_fin: `${anio}-${mesStr}-${String(ultimo).padStart(2, "0")}` };
}

export type ParametrosNominaVigentes = {
  ivssPct: number;
  rpePct: number;
  faovPct: number;
  cestaticketUsd: number;
};

export async function getParametrosVigentes(fecha: string): Promise<ParametrosNominaVigentes> {
  const supabase = await createClient();
  const claves = ["ivss_pct_trabajador", "rpe_pct_trabajador", "faov_pct_trabajador", "cestaticket_monto_usd"];

  const valores: Record<string, number> = {};
  for (const clave of claves) {
    const { data } = await supabase
      .from("parametros_nomina")
      .select("valor")
      .eq("clave", clave)
      .lte("vigente_desde", fecha)
      .order("vigente_desde", { ascending: false })
      .limit(1)
      .maybeSingle();
    valores[clave] = data ? Number(data.valor) : 0;
  }

  return {
    ivssPct: valores.ivss_pct_trabajador,
    rpePct: valores.rpe_pct_trabajador,
    faovPct: valores.faov_pct_trabajador,
    cestaticketUsd: valores.cestaticket_monto_usd,
  };
}

export async function getPeriodos(): Promise<Periodo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("periodos_nomina")
    .select("id, anio, mes, quincena, fecha_inicio, fecha_fin, estado")
    .order("fecha_inicio", { ascending: false });
  return data ?? [];
}

export async function getPeriodoActual(): Promise<Periodo | null> {
  const supabase = await createClient();
  const { anio, mes, quincena } = periodoDeFecha(hoyCaracas());
  const { data } = await supabase
    .from("periodos_nomina")
    .select("id, anio, mes, quincena, fecha_inicio, fecha_fin, estado")
    .eq("anio", anio)
    .eq("mes", mes)
    .eq("quincena", quincena)
    .maybeSingle();
  return data;
}

export type TrabajadorParaNomina = {
  id: string;
  nombre: string;
  apellido: string;
  salario_base_mensual: number;
  salario_formal_mensual_bs: number | null;
};

export type ReciboResumen = {
  id: string;
  trabajador_id: string;
  nombre: string;
  apellido: string;
  neto_pagar: number;
  anulado: boolean;
};

export async function getPeriodoDetalle(periodoId: string): Promise<{
  periodo: Periodo;
  pendientes: TrabajadorParaNomina[];
  generados: ReciboResumen[];
} | null> {
  const supabase = await createClient();

  const { data: periodo } = await supabase
    .from("periodos_nomina")
    .select("id, anio, mes, quincena, fecha_inicio, fecha_fin, estado")
    .eq("id", periodoId)
    .maybeSingle();

  if (!periodo) return null;

  const { data: trabajadores } = await supabase
    .from("trabajadores")
    .select("id, nombre, apellido, salario_base_mensual, salario_formal_mensual_bs")
    .eq("estado", "activo")
    .order("apellido");

  const { data: recibos } = await supabase
    .from("recibos_nomina")
    .select("id, trabajador_id, neto_pagar, anulado, trabajador:trabajadores!inner(nombre, apellido)")
    .eq("periodo_nomina_id", periodoId);

  const idsConRecibo = new Set((recibos ?? []).map((r) => r.trabajador_id));

  return {
    periodo,
    pendientes: (trabajadores ?? [])
      .filter((t) => !idsConRecibo.has(t.id))
      .map((t) => ({
        id: t.id,
        nombre: t.nombre,
        apellido: t.apellido,
        salario_base_mensual: Number(t.salario_base_mensual),
        salario_formal_mensual_bs:
          t.salario_formal_mensual_bs === null ? null : Number(t.salario_formal_mensual_bs),
      })),
    generados: (recibos ?? []).map((r) => {
      const trabajador = Array.isArray(r.trabajador) ? r.trabajador[0] : r.trabajador;
      return {
        id: r.id,
        trabajador_id: r.trabajador_id,
        nombre: trabajador?.nombre ?? "",
        apellido: trabajador?.apellido ?? "",
        neto_pagar: Number(r.neto_pagar),
        anulado: r.anulado,
      };
    }),
  };
}

export type ReciboDetalleNomina = {
  id: string;
  trabajador_nombre: string;
  trabajador_apellido: string;
  trabajador_cedula: string;
  cargo_nombre: string;
  periodo: Periodo;
  tasa_bcv_valor: number;
  dias_trabajados: number;
  dias_descanso: number;
  total_asignaciones: number;
  total_deducciones: number;
  neto_pagar: number;
  anulado: boolean;
  motivo_anulacion: string | null;
  detalle: { codigo: string; nombre: string; tipo: string; monto: number; base_calculo: number | null }[];
};

export async function getReciboNominaDetalle(id: string): Promise<ReciboDetalleNomina | null> {
  const supabase = await createClient();

  const { data: recibo, error } = await supabase
    .from("recibos_nomina")
    .select(
      `id, tasa_bcv_valor, dias_trabajados, dias_descanso, total_asignaciones, total_deducciones,
       neto_pagar, anulado, motivo_anulacion,
       trabajador:trabajadores!inner(nombre, apellido, cedula, cargo:cargos!inner(nombre)),
       periodo:periodos_nomina!inner(id, anio, mes, quincena, fecha_inicio, fecha_fin, estado)`,
    )
    .eq("id", id)
    .single();

  if (error || !recibo) return null;

  const trabajador = Array.isArray(recibo.trabajador) ? recibo.trabajador[0] : recibo.trabajador;
  const cargo = trabajador ? (Array.isArray(trabajador.cargo) ? trabajador.cargo[0] : trabajador.cargo) : null;
  const periodo = Array.isArray(recibo.periodo) ? recibo.periodo[0] : recibo.periodo;

  const { data: detalle } = await supabase
    .from("nomina_detalle")
    .select("monto, base_calculo, concepto:nomina_conceptos!inner(codigo, nombre, tipo)")
    .eq("recibo_nomina_id", id);

  return {
    id: recibo.id,
    trabajador_nombre: trabajador?.nombre ?? "",
    trabajador_apellido: trabajador?.apellido ?? "",
    trabajador_cedula: trabajador?.cedula ?? "",
    cargo_nombre: cargo?.nombre ?? "",
    periodo: periodo as Periodo,
    tasa_bcv_valor: Number(recibo.tasa_bcv_valor),
    dias_trabajados: Number(recibo.dias_trabajados),
    dias_descanso: Number(recibo.dias_descanso),
    total_asignaciones: Number(recibo.total_asignaciones),
    total_deducciones: Number(recibo.total_deducciones),
    neto_pagar: Number(recibo.neto_pagar),
    anulado: recibo.anulado,
    motivo_anulacion: recibo.motivo_anulacion,
    detalle: (detalle ?? []).map((d) => {
      const concepto = Array.isArray(d.concepto) ? d.concepto[0] : d.concepto;
      return {
        codigo: concepto?.codigo ?? "",
        nombre: concepto?.nombre ?? "",
        tipo: concepto?.tipo ?? "",
        monto: Number(d.monto),
        base_calculo: d.base_calculo === null ? null : Number(d.base_calculo),
      };
    }),
  };
}
