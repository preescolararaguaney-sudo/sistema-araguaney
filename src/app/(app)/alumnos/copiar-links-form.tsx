"use client";

import { useState } from "react";

type AlumnoParaLink = {
  alumno_id: string;
  nombre: string;
  apellido: string;
  aula_nombre: string;
};

export function CopiarLinksMasivo({ alumnos }: { alumnos: AlumnoParaLink[] }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    const origen = window.location.origin;
    const texto = alumnos
      .map((a) => `${a.aula_nombre} — ${a.nombre} ${a.apellido}: ${origen}/inscripcion?alumno=${a.alumno_id}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard puede estar bloqueado (permiso denegado); no rompe la página.
    }
  }

  if (alumnos.length === 0) return null;

  return (
    <button
      type="button"
      onClick={copiar}
      className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
    >
      {copiado ? "¡Copiado!" : `Copiar links (${alumnos.length})`}
    </button>
  );
}
