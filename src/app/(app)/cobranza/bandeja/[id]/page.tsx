import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPagoPendiente } from "@/lib/queries/bandeja";
import { buscarMatriculas, getMatriculaDetalle } from "@/lib/queries/matriculas";
import { destinatarioDeMatricula, sugerirConceptos } from "@/lib/matching-pagos";
import { formatBs, formatFecha, formatFechaHora, hoyCaracas, METODO_PAGO_LABEL } from "@/lib/format";
import { BuscadorAlumno } from "../../buscador-alumno";
import { TablaCuotas } from "../../tabla-cuotas";
import { PagoForm } from "../../pagos/nuevo/pago-form";
import { aprobarPendiente } from "./actions";
import { FacturaCampos } from "./factura-campos";
import { RechazarForm } from "./rechazar-form";
import { NumeroFacturaForm } from "./numero-factura-form";

export default async function PagoPendientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ matricula?: string; q?: string }>;
}) {
  await requireRol(["directora", "administracion"]);
  const { id } = await params;
  const { matricula: matriculaParam, q } = await searchParams;

  const p = await getPagoPendiente(id);
  if (!p) notFound();

  const supabase = await createClient();
  const esPdf = p.comprobante_url?.toLowerCase().endsWith(".pdf") ?? false;

  const columnaCapture = (
    <div className="flex flex-col gap-4">
      {p.comprobante_url &&
        (esPdf ? (
          <a href={p.comprobante_url} target="_blank" rel="noreferrer" className="text-sm text-emerald-700 underline">
            Abrir el comprobante (PDF)
          </a>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- capture externo en Supabase Storage, sin dimensiones conocidas
          <img
            src={p.comprobante_url}
            alt="Comprobante de pago"
            className="max-h-[70vh] w-full rounded-xl border border-stone-200 bg-white object-contain"
          />
        ))}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl border border-stone-200 bg-white p-4 text-sm">
        <Dato etiqueta="Monto leído" valor={p.monto_bs != null ? formatBs(p.monto_bs) : "No se leyó"} />
        <Dato etiqueta="Fecha leída" valor={p.fecha_pago ? formatFecha(p.fecha_pago) : "No se leyó"} />
        <Dato etiqueta="Referencia" valor={p.referencia ?? "No se leyó"} />
        <Dato etiqueta="Banco" valor={p.banco ?? "—"} />
        <Dato etiqueta="Método" valor={p.metodo ? (METODO_PAGO_LABEL[p.metodo] ?? p.metodo) : "—"} />
        <Dato etiqueta="Transfirió" valor={p.emisor_nombre ?? "—"} />
        <Dato etiqueta="Nota enviada" valor={p.nota ?? "—"} />
        <Dato etiqueta="Enviado" valor={`${formatFechaHora(p.creado_en)}${p.enviado_por ? ` · ${p.enviado_por}` : ""}`} />
      </dl>
    </div>
  );

  const encabezado = (
    <div>
      <Link href="/cobranza/bandeja" className="text-xs text-stone-500 hover:underline">
        ← Volver a la bandeja
      </Link>
      <h1 className="mt-1 text-lg font-semibold text-stone-900">Pago recibido por Telegram</h1>
    </div>
  );

  // ---- Ya procesado ----
  if (p.estado !== "pendiente") {
    return (
      <div className="flex flex-col gap-6">
        {encabezado}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {columnaCapture}
          <div className="flex flex-col gap-4">
            {p.estado === "aprobado" && (
              <>
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Pago aprobado y registrado para {p.alumno_nombre} ({p.aula_nombre}).
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/cobranza/bandeja/${p.id}/ficha`}
                    className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                  >
                    Ver ficha para factura
                  </Link>
                  {p.pago_id && (
                    <Link
                      href={`/cobranza/pagos/${p.pago_id}/recibo`}
                      className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
                    >
                      Ver recibo
                    </Link>
                  )}
                </div>
                <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500">Facturar a</p>
                  <p className="font-medium">{p.factura_nombre}</p>
                  <p>{p.factura_cedula}{p.factura_telefono ? ` · ${p.factura_telefono}` : ""}</p>
                </div>
                <NumeroFacturaForm id={p.id} numero={p.factura_numero} control={p.factura_control} />
              </>
            )}
            {p.estado === "duplicado" && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                Esta referencia ya estaba registrada (en la bandeja o como pago), por eso quedó marcada como duplicada.
              </p>
            )}
            {p.estado === "rechazado" && (
              <p className="rounded-md bg-stone-100 px-3 py-2 text-sm text-stone-700">
                Rechazado. Motivo: {p.motivo_rechazo}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Por aprobar ----
  const { data: anio } = await supabase
    .from("anios_escolares")
    .select("id")
    .eq("activo", true)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();

  const matriculaId = matriculaParam ?? p.matricula_id;

  if (!matriculaId) {
    const busqueda = q ?? p.nota ?? "";
    const resultados = anio ? await buscarMatriculas(busqueda, anio.id) : [];
    return (
      <div className="flex flex-col gap-6">
        {encabezado}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {columnaCapture}
          <div className="flex flex-col gap-4">
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No pude identificar al alumno. Búscalo para continuar.
            </p>
            <BuscadorAlumno basePath={`/cobranza/bandeja/${p.id}`} q={busqueda} resultados={resultados} />
            <RechazarForm id={p.id} />
          </div>
        </div>
      </div>
    );
  }

  const detalle = await getMatriculaDetalle(matriculaId);
  if (!detalle) return <p className="text-sm text-red-700">No se encontró esa matrícula.</p>;

  const cambioAlumno = matriculaParam !== undefined && matriculaParam !== p.matricula_id;
  const conceptoIds = cambioAlumno ? (await sugerirConceptos(matriculaId, p.nota)).ids : p.conceptos_sugeridos;
  const destino = cambioAlumno ? await destinatarioDeMatricula(matriculaId) : null;
  const factura = {
    nombre: destino ? destino.nombre : (p.factura_nombre ?? ""),
    cedula: destino ? (destino.cedula ?? "") : (p.factura_cedula ?? ""),
    telefono: destino ? (destino.telefono ?? "") : (p.factura_telefono ?? ""),
    direccion: p.factura_direccion ?? "",
  };

  const fecha = p.fecha_pago ?? hoyCaracas();
  const { data: tasaRow } = await supabase
    .from("tasas_bcv")
    .select("tasa, fecha")
    .lte("fecha", fecha)
    .order("fecha", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      {encabezado}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {columnaCapture}
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-base font-semibold text-stone-900">
              {detalle.alumno_nombre} {detalle.alumno_apellido}
              <span className="ml-2 text-sm font-normal text-stone-500">— {detalle.aula_nombre}</span>
            </p>
            <Link href={`/cobranza/bandeja/${p.id}?q=${encodeURIComponent(p.nota ?? "")}`} className="text-xs text-emerald-700 hover:underline">
              ¿No es este alumno? Buscar otro
            </Link>
          </div>

          {(!factura.nombre || !factura.cedula) && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Faltan datos de quien va en la factura (nombre y cédula). Complétalos abajo antes de aprobar.
            </p>
          )}
          {tasaRow && (
            <p className="text-xs text-stone-500">
              Tasa BCV sugerida: {Number(tasaRow.tasa)} (del {formatFecha(tasaRow.fecha)}). Puedes cambiarla.
            </p>
          )}

          <PagoForm
            matriculaId={matriculaId}
            fechaHoy={fecha}
            tasaHoy={tasaRow ? Number(tasaRow.tasa) : null}
            cuotas={detalle.cuotas}
            accion={aprobarPendiente}
            ocultos={{ pendiente_id: p.id }}
            comprobanteUrl={p.comprobante_url ?? undefined}
            textoBoton="Aprobar y registrar pago"
            inicial={{
              monto: p.monto_bs ?? undefined,
              referencia: p.referencia ?? undefined,
              metodo: p.metodo ?? undefined,
              conceptoIds,
            }}
          >
            <FacturaCampos {...factura} />
          </PagoForm>

          <TablaCuotas cuotas={detalle.cuotas} />
          <RechazarForm id={p.id} />
        </div>
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <>
      <dt className="text-stone-500">{etiqueta}</dt>
      <dd className="font-medium text-stone-900">{valor}</dd>
    </>
  );
}
