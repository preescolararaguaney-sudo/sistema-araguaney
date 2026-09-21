"use client";

import { useEffect, useState, useTransition } from "react";
import { obtenerTasaBcvActual } from "./cobranza/pagos/nuevo/actions";

function redondear(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

export function CalculadoraBcv({
  tasaInicial,
  fechaTasa,
  hoy,
}: {
  tasaInicial: number | null;
  fechaTasa: string | null;
  hoy: string;
}) {
  const [tasa, setTasa] = useState(tasaInicial ?? 0);
  const [fecha, setFecha] = useState(fechaTasa);
  const [usd, setUsd] = useState("");
  const [bs, setBs] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [consultando, iniciarConsulta] = useTransition();

  function actualizarTasa() {
    setError(null);
    iniciarConsulta(async () => {
      const resultado = await obtenerTasaBcvActual();
      if ("error" in resultado) {
        setError(resultado.error);
        return;
      }
      setTasa(resultado.tasa);
      setFecha(resultado.fecha);
      const n = Number(usd);
      if (usd && n > 0) setBs(redondear(n * resultado.tasa));
    });
  }

  useEffect(() => {
    if (fechaTasa === hoy) return;
    let cancelado = false;
    obtenerTasaBcvActual().then((resultado) => {
      if (cancelado || "error" in resultado) return;
      setTasa(resultado.tasa);
      setFecha(resultado.fecha);
    });
    return () => {
      cancelado = true;
    };
  }, [fechaTasa, hoy]);

  function cambiarUsd(valor: string) {
    setUsd(valor);
    const n = Number(valor);
    setBs(valor && n >= 0 && tasa > 0 ? redondear(n * tasa) : "");
  }

  function cambiarBs(valor: string) {
    setBs(valor);
    const n = Number(valor);
    setUsd(valor && n >= 0 && tasa > 0 ? redondear(n / tasa) : "");
  }

  function cambiarTasa(valor: string) {
    const nueva = Number(valor) || 0;
    setTasa(nueva);
    const n = Number(usd);
    if (usd && n >= 0 && nueva > 0) setBs(redondear(n * nueva));
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 sm:col-span-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
          Calculadora dólar / bolívar (BCV)
        </p>
        <button
          type="button"
          onClick={actualizarTasa}
          disabled={consultando}
          className="shrink-0 rounded-md border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-60"
        >
          {consultando ? "Consultando..." : "Actualizar tasa BCV"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">
            Tasa (Bs por USD){fecha && fecha !== hoy ? ` — del ${fecha}` : ""}
          </span>
          <input
            type="number"
            step="0.0001"
            value={tasa || ""}
            onChange={(e) => cambiarTasa(e.target.value)}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Dólares (USD)</span>
          <input
            type="number"
            step="0.01"
            value={usd}
            onChange={(e) => cambiarUsd(e.target.value)}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Bolívares (Bs)</span>
          <input
            type="number"
            step="0.01"
            value={bs}
            onChange={(e) => cambiarBs(e.target.value)}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </label>
      </div>

      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
