"use client";

import { useState } from "react";

export function CopiarLinkFormulario({ alumnoId }: { alumnoId: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    const url = `${window.location.origin}/inscripcion?alumno=${alumnoId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard puede estar bloqueado (permiso denegado); no rompe la página.
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100"
    >
      {copiado ? "¡Copiado!" : "Copiar link para el representante"}
    </button>
  );
}
