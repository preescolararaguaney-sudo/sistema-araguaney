"use client";

import { useMemo, useState } from "react";

type Nino = { apellido: string; nombre: string; certificado: number | null };

function plano(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function inicial(n: Nino) {
  return plano(n.apellido).charAt(0).toUpperCase() || "#";
}

export function ListaNinos({ ninos }: { ninos: Nino[] }) {
  const [q, setQ] = useState("");

  const filtrados = useMemo(() => {
    const terminos = plano(q).split(/\s+/).filter(Boolean);
    if (terminos.length === 0) return ninos;
    return ninos.filter((n) => {
      const texto = plano(`${n.apellido} ${n.nombre}`);
      return terminos.every((t) => texto.includes(t));
    });
  }, [q, ninos]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, Nino[]>();
    for (const n of filtrados) {
      const l = inicial(n);
      if (!mapa.has(l)) mapa.set(l, []);
      mapa.get(l)!.push(n);
    }
    return Array.from(mapa.entries());
  }, [filtrados]);

  return (
    <div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar niño por apellido o nombre..."
        autoComplete="off"
        className="w-full rounded-xl border-2 border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-red-600"
      />
      <p className="mt-2 text-xs text-stone-500">
        {filtrados.length} de {ninos.length} niños
      </p>

      {q.trim() === "" && grupos.length > 1 && (
        <nav className="mt-3 flex flex-wrap gap-1.5" aria-label="Ir a la letra">
          {grupos.map(([letra]) => (
            <a
              key={letra}
              href={`#letra-${letra}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-200 text-sm font-semibold text-stone-800 active:bg-stone-300"
            >
              {letra}
            </a>
          ))}
        </nav>
      )}

      <div className="mt-4 flex flex-col gap-4">
        {grupos.map(([letra, items]) => (
          <section key={letra} id={`letra-${letra}`} className="scroll-mt-4">
            <h3 className="mb-1 text-sm font-bold text-red-700">{letra}</h3>
            <ul className="overflow-hidden rounded-xl border border-stone-200 bg-white">
              {items.map((n, i) => (
                <li
                  key={`${n.apellido}-${n.nombre}-${i}`}
                  className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3 last:border-0"
                >
                  <span className="text-base font-medium text-stone-900">
                    {n.apellido} {n.nombre}
                  </span>
                  {n.certificado !== null ? (
                    <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-sm font-semibold text-emerald-800">
                      Cert. {n.certificado}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-md bg-red-600 px-2 py-1 text-xs font-bold text-white">
                      SIN COBERTURA
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
        {grupos.length === 0 && (
          <p className="rounded-xl border border-stone-200 bg-white px-4 py-6 text-center text-sm text-stone-500">
            Ningún niño coincide con la búsqueda.
          </p>
        )}
      </div>
    </div>
  );
}
