"use client";

import { useActionState, useState, useTransition } from "react";
import { generarNominaPeriodo } from "./actions";
import { obtenerTasaBcvActual } from "../../cobranza/pagos/nuevo/actions";
import type { TrabajadorParaNomina } from "@/lib/queries/nomina";

type Fila = {
  trabajador_id: string;
  nombre: string;
  dias_trabajados: number;
  dias_descanso: number;
  monto_objetivo_usd: number;
  incluir_cestaticket: boolean;
};

export function NominaForm({
  periodoId,
  fechaPago,
  tasaHoy,
  trabajadores,
  mostrarCestaticket,
}: {
  periodoId: string;
  fechaPago: string;
  tasaHoy: number | null;
  trabajadores: TrabajadorParaNomina[];
  mostrarCestaticket: boolean;
}) {
  const [state, formAction, pending] = useActionState(generarNominaPeriodo, undefined);
  const [tasa, setTasa] = useState(tasaHoy ?? 0);
  const [consultando, iniciarConsulta] = useTransition();
  const [errorTasa, setErrorTasa] = useState<string | null>(null);
  const [filas, setFilas] = useState<Fila[]>(
    trabajadores.map((t) => ({
      trabajador_id: t.id,
      nombre: `${t.nombre} ${t.apellido}`,
      dias_trabajados: 10,
      dias_descanso: 5,
      monto_objetivo_usd: Math.round((t.salario_base_mensual / 2) * 100) / 100,
      incluir_cestaticket: false,
    })),
  );

  function actualizarFila(i: number, campo: keyof Fila, valor: string | number | boolean) {
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, [campo]: valor } : f)));
  }

  function consultarTasa() {
    setErrorTasa(null);
    iniciarConsulta(async () => {
      const resultado = await obtenerTasaBcvActual();
      if ("error" in resultado) setErrorTasa(resultado.error);
      else setTasa(resultado.tasa);
    });
  }

  if (trabajadores.length === 0) {
    return <p className="text-sm text-stone-500">No hay trabajadores pendientes por generar en este período.</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="periodo_id" value={periodoId} />
      <input type="hidden" name="fecha_pago" value={fechaPago} />
      <input type="hidden" name="tasa_bcv" value={tasa || ""} />
      <input type="hidden" name="filas_json" value={JSON.stringify(filas)} />

      <div className="flex items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-stone-700">Tasa BCV a usar</span>
          <input
            type="number"
            step="0.0001"
            value={tasa || ""}
            onChange={(e) => setTasa(Number(e.target.value) || 0)}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={consultarTasa}
          disabled={consultando}
          className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-60"
        >
          {consultando ? "Consultando..." : "Consultar tasa BCV de hoy"}
        </button>
        {errorTasa && <span className="text-xs text-red-700">{errorTasa}</span>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="px-3 py-2 font-medium">Trabajador</th>
              <th className="px-3 py-2 font-medium">Días trabajados</th>
              <th className="px-3 py-2 font-medium">Días descanso</th>
              <th className="px-3 py-2 font-medium">Objetivo quincenal (USD)</th>
              {mostrarCestaticket && <th className="px-3 py-2 font-medium">Cestaticket</th>}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={f.trabajador_id} className="border-b border-stone-100 last:border-0">
                <td className="px-3 py-2">{f.nombre}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.5"
                    value={f.dias_trabajados}
                    onChange={(e) => actualizarFila(i, "dias_trabajados", Number(e.target.value))}
                    className="w-20 rounded-md border border-stone-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.5"
                    value={f.dias_descanso}
                    onChange={(e) => actualizarFila(i, "dias_descanso", Number(e.target.value))}
                    className="w-20 rounded-md border border-stone-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.01"
                    value={f.monto_objetivo_usd}
                    onChange={(e) => actualizarFila(i, "monto_objetivo_usd", Number(e.target.value))}
                    className="w-28 rounded-md border border-stone-300 px-2 py-1 text-sm"
                  />
                </td>
                {mostrarCestaticket && (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={f.incluir_cestaticket}
                      onChange={(e) => actualizarFila(i, "incluir_cestaticket", e.target.checked)}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || !tasa}
        className="self-start rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Generando..." : `Generar nómina (${filas.length})`}
      </button>
    </form>
  );
}
