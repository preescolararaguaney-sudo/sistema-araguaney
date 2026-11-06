"use client";

import { useActionState, useState, useTransition, type ReactNode } from "react";
import { registrarPago, obtenerTasaBcvActual, type ActionState } from "./actions";
import type { CuotaPlan } from "@/lib/queries/matriculas";

const METODOS = [
  { value: "transferencia_bs", label: "Transferencia en Bs" },
  { value: "pago_movil", label: "Pago móvil" },
  { value: "efectivo_bs", label: "Efectivo en Bs" },
  { value: "efectivo_usd", label: "Efectivo en USD" },
  { value: "zelle", label: "Zelle" },
  { value: "otro", label: "Otro" },
];

// Valores con los que arranca el formulario cuando el pago viene de la bandeja
// (ya leído del capture) en vez de teclearse desde cero.
export type PagoInicial = {
  monto?: number;
  referencia?: string;
  metodo?: string;
  conceptoIds?: string[];
  conceptoLibre?: string;
};

export function PagoForm({
  matriculaId,
  fechaHoy,
  tasaHoy,
  cuotas,
  accion = registrarPago,
  inicial,
  ocultos,
  comprobanteUrl,
  textoBoton = "Registrar pago",
  children,
}: {
  matriculaId: string;
  fechaHoy: string;
  tasaHoy: number | null;
  cuotas: CuotaPlan[];
  accion?: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  inicial?: PagoInicial;
  ocultos?: Record<string, string>;
  comprobanteUrl?: string;
  textoBoton?: string;
  children?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(accion, undefined);
  const [moneda, setMoneda] = useState<"BS" | "USD">("BS");
  const [tasa, setTasa] = useState(tasaHoy ?? 0);
  const [monto, setMonto] = useState(inicial?.monto ?? 0);
  const [consultandoTasa, iniciarConsultaTasa] = useTransition();
  const [errorTasa, setErrorTasa] = useState<string | null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set(inicial?.conceptoIds ?? []));
  const [repartir, setRepartir] = useState(false);
  const [asignaciones, setAsignaciones] = useState<Record<string, string>>({});

  const pendientes = cuotas.filter((c) => c.estado !== "pagado");
  // Lo que falta de lo seleccionado, a precio de la moneda en que se paga: en
  // bolívares algunas cuotas valen más (ej. $150 en vez de $130).
  const saldoSeleccionado = pendientes
    .filter((c) => seleccionados.has(c.id))
    .reduce(
      (acc, c) => acc + (c.monto_usd - c.monto_usd_pagado) / (moneda === "BS" ? (c.factor_bs ?? 1) : 1),
      0,
    );

  const equivalente = moneda === "BS" ? (tasa > 0 ? monto / tasa : 0) : monto * tasa;

  // Lo que se pagó, en USD a precio de la moneda del pago (para repartirlo entre cuotas).
  const montoUsd = moneda === "BS" ? (tasa > 0 ? monto / tasa : 0) : monto;
  const factorDe = (c: CuotaPlan) => (moneda === "BS" ? (c.factor_bs ?? 1) : 1);
  const elegidas = pendientes.filter((c) => seleccionados.has(c.id));

  // Reparto sugerido: de la cuota más antigua a la más nueva, igual que sin reparto manual.
  function repartoAutomatico(): Record<string, string> {
    let restante = montoUsd;
    const out: Record<string, string> = {};
    for (const c of elegidas) {
      const necesita = (c.monto_usd - c.monto_usd_pagado) / factorDe(c);
      const usd = Math.max(0, Math.min(necesita, restante));
      out[c.id] = usd > 0 ? usd.toFixed(2) : "";
      restante -= usd;
    }
    return out;
  }
  const sumaRepartida = elegidas.reduce((acc, c) => acc + (Number(asignaciones[c.id]) || 0), 0);

  // Meses anteriores que siguen pendientes y que se darían por pagados: las mensualidades
  // anteriores a la más antigua de las seleccionadas.
  const mesesElegidos = elegidas.filter((c) => c.tipo === "mensualidad" && c.mes_referencia).map((c) => c.mes_referencia as string);
  const mesMasAntiguo = mesesElegidos.length > 0 ? mesesElegidos.reduce((a, b) => (a < b ? a : b)) : null;
  const mesesAnteriores = mesMasAntiguo
    ? pendientes.filter((c) => c.tipo === "mensualidad" && c.mes_referencia && c.mes_referencia < mesMasAntiguo)
    : [];

  function alternarConcepto(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function consultarTasaBcv() {
    setErrorTasa(null);
    iniciarConsultaTasa(async () => {
      const resultado = await obtenerTasaBcvActual();
      if ("error" in resultado) {
        setErrorTasa(resultado.error);
      } else {
        setTasa(resultado.tasa);
      }
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-5">
      <input type="hidden" name="matricula_id" value={matriculaId} />
      {Object.entries(ocultos ?? {}).map(([nombre, valor]) => (
        <input key={nombre} type="hidden" name={nombre} value={valor} />
      ))}

      {!tasaHoy && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          No hay una tasa BCV registrada para hoy todavía. Usa &ldquo;Consultar
          tasa BCV de hoy&rdquo; o escríbela a mano — se guarda para el resto
          del día.
        </p>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-stone-700">
          ¿A qué concepto(s) se aplica este pago?
        </legend>
        <div className="flex flex-col gap-1 rounded-md border border-stone-200 p-2">
          {pendientes.map((c) => (
            <label key={c.id} className="flex items-center justify-between gap-2 rounded px-2 py-1 text-sm hover:bg-stone-50">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="concepto_id"
                  value={c.id}
                  checked={seleccionados.has(c.id)}
                  onChange={() => alternarConcepto(c.id)}
                />
                {c.descripcion}
              </span>
              <span className="text-xs text-stone-500">
                Saldo{" "}
                {((c.monto_usd - c.monto_usd_pagado) / (moneda === "BS" ? (c.factor_bs ?? 1) : 1)).toFixed(2)} USD
                {moneda === "BS" && (c.factor_bs ?? 1) !== 1 && " en Bs"}
              </span>
            </label>
          ))}
          {pendientes.length === 0 && (
            <p className="px-2 py-1 text-sm text-stone-500">Sin conceptos pendientes.</p>
          )}
        </div>
        {seleccionados.size > 0 && (
          <p className="mt-1 text-xs text-stone-500">
            Saldo de lo seleccionado{moneda === "BS" ? " pagando en bolívares" : " pagando en dólares"}: {saldoSeleccionado.toFixed(2)} USD
            {tasa > 0 && ` (≈ ${(saldoSeleccionado * tasa).toFixed(2)} Bs)`}
          </p>
        )}
      </fieldset>

      {elegidas.length > 1 && (
        <div className="flex flex-col gap-2 rounded-md border border-stone-200 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
            <input
              type="checkbox"
              name="repartir"
              checked={repartir}
              onChange={(e) => {
                setRepartir(e.target.checked);
                if (e.target.checked) setAsignaciones(repartoAutomatico());
              }}
            />
            Repartir el monto entre los conceptos a mano
          </label>
          {repartir && (
            <>
              <p className="text-xs text-stone-500">
                Escribe cuántos USD ({moneda === "BS" ? "al precio en bolívares" : "en dólares"}) van a cada concepto. Debe sumar el monto del pago.
              </p>
              {elegidas.map((c) => (
                <label key={c.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{c.descripcion}</span>
                  <input
                    name={`asignacion_${c.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={asignaciones[c.id] ?? ""}
                    onChange={(e) => setAsignaciones((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    className="w-28 rounded-md border border-stone-300 px-2 py-1 text-right text-sm outline-none focus:border-emerald-600"
                  />
                </label>
              ))}
              <p className={`text-xs ${Math.abs(sumaRepartida - montoUsd) <= 0.5 ? "text-emerald-700" : "text-amber-700"}`}>
                Repartido: {sumaRepartida.toFixed(2)} USD de {montoUsd.toFixed(2)} USD del pago.
                <button type="button" onClick={() => setAsignaciones(repartoAutomatico())} className="ml-2 underline">
                  Recalcular
                </button>
              </p>
            </>
          )}
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-stone-700">
          Otro concepto (solo si el pago no es una cuota: insignia, fiesta, etc.)
        </span>
        <input
          name="concepto_libre"
          type="text"
          defaultValue={inicial?.conceptoLibre}
          placeholder="Ej. Fiesta de navidad"
          className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
        />
        <span className="text-xs text-stone-500">
          Si no marcas ninguna cuota, el pago se registra y se factura con este concepto, sin descontar deuda.
        </span>
      </label>

      {mesesAnteriores.length > 0 && (
        <label className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <input type="checkbox" name="dar_por_pagados_anteriores" defaultChecked className="mt-0.5" />
          <span>
            Dar por pagados los meses anteriores:{" "}
            <strong>{mesesAnteriores.map((c) => c.descripcion.replace("Mensualidad ", "")).join(", ")}</strong>. Se asume
            que ya los pagó; quedan asentados como historial y no cuentan como dinero recibido.
          </span>
        </label>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Fecha de pago" name="fecha_pago" type="date" defaultValue={fechaHoy} />
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-stone-700">Tasa BCV del día (Bs por USD)</span>
          <div className="flex gap-2">
            <input
              name="tasa_bcv"
              type="number"
              step="0.0001"
              value={tasa || ""}
              required
              onChange={(e) => setTasa(Number(e.target.value) || 0)}
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
            <button
              type="button"
              onClick={consultarTasaBcv}
              disabled={consultandoTasa}
              className="shrink-0 whitespace-nowrap rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-60"
            >
              {consultandoTasa ? "Consultando..." : "Consultar tasa BCV de hoy"}
            </button>
          </div>
          {errorTasa && <span className="text-xs text-red-700">{errorTasa}</span>}
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-stone-700">¿En qué moneda pagó?</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="radio"
              name="moneda_pago"
              value="BS"
              checked={moneda === "BS"}
              onChange={() => setMoneda("BS")}
            />
            Bolívares (Bs)
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="radio"
              name="moneda_pago"
              value="USD"
              checked={moneda === "USD"}
              onChange={() => setMoneda("USD")}
            />
            Dólares (USD)
          </label>
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-stone-700">
            Monto recibido en {moneda === "BS" ? "Bs" : "USD"}
          </span>
          <input
            name="monto"
            type="number"
            step="0.01"
            required
            defaultValue={inicial?.monto}
            onChange={(e) => setMonto(Number(e.target.value) || 0)}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
          {monto > 0 && tasa > 0 && (
            <span className="text-xs text-stone-500">
              Equivale a {moneda === "BS" ? `${equivalente.toFixed(2)} USD` : `${equivalente.toFixed(2)} Bs`}
            </span>
          )}
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-stone-700">Método de pago</span>
          <select
            name="metodo"
            required
            defaultValue={inicial?.metodo}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          >
            {METODOS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <Campo label="Referencia" name="referencia" type="text" required={false} defaultValue={inicial?.referencia} />
        {comprobanteUrl ? (
          <p className="text-sm text-stone-700">
            Comprobante adjunto desde Telegram.{" "}
            <a href={comprobanteUrl} target="_blank" rel="noreferrer" className="text-emerald-700 underline">
              Abrir
            </a>
          </p>
        ) : (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-stone-700">Foto del comprobante (opcional)</span>
            <input
              name="comprobante_foto"
              type="file"
              accept="image/*,.pdf"
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
            <span className="text-xs text-stone-500">Si no la tienes a mano, puedes agregarla después desde el recibo.</span>
          </label>
        )}
      </div>

      <p className="text-xs text-stone-500">
        Si el monto no cubre por completo lo seleccionado, queda &ldquo;parcial&rdquo;
        y se aplica primero al concepto más antiguo de los marcados.
      </p>

      {children}

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Registrando..." : textoBoton}
      </button>
    </form>
  );
}

function Campo({
  label,
  name,
  type,
  defaultValue,
  required = true,
}: {
  label: string;
  name: string;
  type: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
      />
    </label>
  );
}
