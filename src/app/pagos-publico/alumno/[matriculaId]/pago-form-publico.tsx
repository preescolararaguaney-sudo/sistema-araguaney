"use client";

import { useActionState, useState, useTransition } from "react";
import { registrarPagoPublico, obtenerTasaBcvActualPublico } from "../../actions";

const METODOS = [
  { value: "transferencia_bs", label: "Transferencia en Bs" },
  { value: "pago_movil", label: "Pago móvil" },
  { value: "efectivo_bs", label: "Efectivo en Bs" },
  { value: "efectivo_usd", label: "Efectivo en USD" },
  { value: "zelle", label: "Zelle" },
  { value: "otro", label: "Otro" },
];

export function PagoFormPublico({
  matriculaId,
  fechaHoy,
  tasaHoy,
  totalPendiente,
}: {
  matriculaId: string;
  fechaHoy: string;
  tasaHoy: number | null;
  totalPendiente: number;
}) {
  const [state, formAction, pending] = useActionState(registrarPagoPublico, undefined);
  const [moneda, setMoneda] = useState<"BS" | "USD">("BS");
  const [tasa, setTasa] = useState(tasaHoy ?? 0);
  const [monto, setMonto] = useState(0);
  const [consultandoTasa, iniciarConsultaTasa] = useTransition();
  const [errorTasa, setErrorTasa] = useState<string | null>(null);

  const equivalente = moneda === "BS" ? (tasa > 0 ? monto / tasa : 0) : monto * tasa;

  function consultarTasaBcv() {
    setErrorTasa(null);
    iniciarConsultaTasa(async () => {
      const resultado = await obtenerTasaBcvActualPublico();
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

      <Campo label="Cobrado por (tu nombre)" name="cobrado_por" type="text" />

      {!tasaHoy && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          No hay una tasa BCV registrada para hoy todavía. Usa &ldquo;Consultar
          tasa BCV de hoy&rdquo; o escríbela a mano — se guarda para el resto
          del día.
        </p>
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
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          >
            {METODOS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <Campo label="Referencia" name="referencia" type="text" required={false} />
        <Campo
          label="Comprobante (enlace, opcional)"
          name="comprobante_url"
          type="text"
          required={false}
        />
      </div>

      <p className="text-xs text-stone-500">
        Pendiente del alumno: {totalPendiente.toFixed(2)} USD
        {tasa > 0 && ` (≈ ${(totalPendiente * tasa).toFixed(2)} Bs a esta tasa)`}. El
        pago se aplica automáticamente a las cuotas más antiguas primero
        (abono). Si el monto no cubre una cuota completa, queda &ldquo;parcial&rdquo;.
      </p>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Registrando..." : "Registrar pago"}
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
