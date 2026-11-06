import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type PersonaFactura = {
  nombre: string;
  cedula: string | null;
  telefono: string | null;
};

export type Candidato = {
  matriculaId: string;
  alumnoNombre: string;
  aula: string;
  madre: PersonaFactura | null;
  padre: PersonaFactura | null;
  puntaje: number;
};

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const PALABRAS_VACIAS = new Set([
  ...MESES,
  "sept",
  "mensualidad",
  "matricula",
  "pago",
  "abono",
  "del",
  "los",
  "las",
  "por",
  "con",
  "para",
  "bs",
  "usd",
  "bolivares",
  "transferencia",
]);

export function plano(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function palabras(texto: string): string[] {
  return plano(texto)
    .split(" ")
    .filter((p) => p.length >= 3 && !/^\d+$/.test(p) && !PALABRAS_VACIAS.has(p));
}

export function soloDigitos(texto: string | null | undefined): string {
  return (texto ?? "").replace(/\D/g, "");
}

// Madre; si no hay madre cargada, el padre. Nunca dos por niño.
export function destinatarioFactura(c: Candidato): PersonaFactura | null {
  return c.madre ?? c.padre;
}

type Fila = {
  id: string;
  alumno: {
    nombre: string;
    apellido: string;
    alumno_contactos: {
      rol: string;
      persona: { nombre: string; apellido: string; cedula: string | null; telefono: string | null } | { nombre: string; apellido: string; cedula: string | null; telefono: string | null }[] | null;
    }[];
  } | null;
  aula: { nombre: string } | { nombre: string }[] | null;
};

const uno = <T,>(x: T | T[] | null | undefined): T | null =>
  Array.isArray(x) ? (x[0] ?? null) : (x ?? null);

async function cargarMatriculasActivas(): Promise<Fila[]> {
  const admin = createAdminClient();
  const { data: anio } = await admin
    .from("anios_escolares")
    .select("id")
    .eq("activo", true)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!anio) return [];

  const { data } = await admin
    .from("matriculas")
    .select(
      `id,
       alumno:alumnos!inner(nombre, apellido, alumno_contactos(rol, persona:personas(nombre, apellido, cedula, telefono))),
       aula:aulas(nombre)`,
    )
    .eq("anio_escolar_id", anio.id)
    .eq("estado", "inscrito");

  return (data ?? []) as unknown as Fila[];
}

/**
 * Busca a qué alumno corresponde un pago, a partir de textos libres (la nota
 * de quien reenvía, lo que lee la IA) y de quién transfirió. Devuelve los
 * mejores candidatos con un puntaje; el llamador decide si el primero es lo
 * bastante claro como para sugerirlo.
 */
export async function buscarCandidatos(
  textos: (string | null | undefined)[],
  emisor: { nombre?: string | null; cedula?: string | null } = {},
): Promise<Candidato[]> {
  const filas = await cargarMatriculasActivas();
  const tokens = [...new Set(textos.flatMap((t) => palabras(t ?? "")))];
  const cedulaEmisor = soloDigitos(emisor.cedula);
  const tokensEmisor = palabras(emisor.nombre ?? "");

  const candidatos: Candidato[] = [];
  for (const f of filas) {
    if (!f.alumno) continue;
    const palabrasAlumno = plano(`${f.alumno.nombre} ${f.alumno.apellido}`).split(" ");

    let puntaje = 0;
    for (const t of tokens) {
      if (palabrasAlumno.includes(t)) puntaje += 2;
      else if (t.length >= 3 && palabrasAlumno.some((p) => p.startsWith(t))) puntaje += 1;
    }

    const contactos = f.alumno.alumno_contactos
      .map((c) => ({ rol: c.rol, p: uno(c.persona) }))
      .filter((c): c is { rol: string; p: NonNullable<typeof c.p> } => c.p !== null);

    if (cedulaEmisor.length >= 5 && contactos.some((c) => soloDigitos(c.p.cedula) === cedulaEmisor)) {
      puntaje += 6;
    }
    if (tokensEmisor.length > 0) {
      const enContactos = contactos.some((c) => {
        const pc = plano(`${c.p.nombre} ${c.p.apellido}`).split(" ");
        return tokensEmisor.filter((t) => pc.includes(t)).length >= 2;
      });
      if (enContactos) puntaje += 3;
    }

    if (puntaje <= 0) continue;

    const aPersona = (rol: string): PersonaFactura | null => {
      const c = contactos.find((x) => x.rol === rol);
      return c
        ? {
            nombre: `${c.p.nombre} ${c.p.apellido}`.replace(/\s+/g, " ").trim(),
            cedula: c.p.cedula,
            telefono: c.p.telefono,
          }
        : null;
    };

    candidatos.push({
      matriculaId: f.id,
      alumnoNombre: `${f.alumno.nombre} ${f.alumno.apellido}`.replace(/\s+/g, " ").trim(),
      aula: uno(f.aula)?.nombre ?? "",
      madre: aPersona("madre"),
      padre: aPersona("padre"),
      puntaje,
    });
  }

  return candidatos.sort((a, b) => b.puntaje - a.puntaje).slice(0, 5);
}

// El primero se sugiere solo si saca puntaje suficiente (al menos un apellido o nombre
// completo) y nadie más empata con él: si dos hermanos o dos niñas con el mismo nombre
// puntúan igual, no se adivina y se deja elegir en el sistema.
export function candidatoClaro(candidatos: Candidato[]): Candidato | null {
  const [primero, segundo] = candidatos;
  if (!primero || primero.puntaje < 2) return null;
  if (segundo && segundo.puntaje >= primero.puntaje) return null;
  return primero;
}

const ABREVIATURAS_MES: Record<string, number> = {
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, sept: 9, oct: 10, nov: 11, dic: 12,
};

/** Número del mes (1–12) si alguna palabra del texto es un mes ("octubre", "oct"); 0 si no hay. */
function detectarMes(texto: string): number {
  for (const palabra of plano(texto).split(" ")) {
    const completo = MESES.indexOf(palabra);
    if (completo >= 0) return completo + 1;
    if (ABREVIATURAS_MES[palabra]) return ABREVIATURAS_MES[palabra];
  }
  return 0;
}

export type ConceptosSugeridos = { ids: string[]; descripciones: string[] };

/**
 * Qué cuota(s) cubre probablemente el pago: si la nota menciona un mes, la
 * cuota de ese mes; si no, la más antigua pendiente. Es solo una sugerencia:
 * al aprobar se puede cambiar.
 */
export async function sugerirConceptos(
  matriculaId: string,
  mes: string | null | undefined,
  fechaPago?: string | null,
): Promise<ConceptosSugeridos> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("plan_pago_items")
    .select("id, descripcion, mes_referencia, fecha_vencimiento")
    .eq("matricula_id", matriculaId)
    .neq("estado", "pagado")
    .order("fecha_vencimiento", { ascending: true });
  const pendientes = data ?? [];
  if (pendientes.length === 0) return { ids: [], descripciones: [] };

  // Si el texto no menciona un mes, se asume el mes de la fecha del pago (lo normal es
  // pagar el mes en curso); si esa cuota no está pendiente, cae en la más antigua.
  const indiceMes =
    detectarMes(mes ?? "") || (fechaPago ? Number(String(fechaPago).slice(5, 7)) : 0);
  if (indiceMes > 0) {
    const deEseMes = pendientes.find(
      (p) => p.mes_referencia && Number(String(p.mes_referencia).slice(5, 7)) === indiceMes,
    );
    if (deEseMes) return { ids: [deEseMes.id], descripciones: [deEseMes.descripcion] };
  }

  const masAntigua = pendientes[0];
  return { ids: [masAntigua.id], descripciones: [masAntigua.descripcion] };
}

/** Madre (o padre si no hay madre) de la matrícula, para prellenar "facturar a". */
export async function destinatarioDeMatricula(matriculaId: string): Promise<PersonaFactura | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("matriculas")
    .select(
      "id, alumno:alumnos!inner(nombre, apellido, alumno_contactos(rol, persona:personas(nombre, apellido, cedula, telefono))), aula:aulas(nombre)",
    )
    .eq("id", matriculaId)
    .maybeSingle();
  const fila = data as unknown as Fila | null;
  const contactos = (fila?.alumno?.alumno_contactos ?? []).map((c) => ({ rol: c.rol, p: uno(c.persona) }));
  const elegido = contactos.find((c) => c.rol === "madre" && c.p) ?? contactos.find((c) => c.rol === "padre" && c.p);
  const p = elegido?.p;
  return p
    ? { nombre: `${p.nombre} ${p.apellido}`.replace(/\s+/g, " ").trim(), cedula: p.cedula, telefono: p.telefono }
    : null;
}
