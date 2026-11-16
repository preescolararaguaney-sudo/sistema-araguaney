const PARTICULAS = new Set(["de", "del", "la", "las", "los", "y"]);
const CAPITALIZADA = /^\p{Lu}\p{Ll}+$/u;

// "ana-maria" -> "Ana-Maria", "o'brien" -> "O'Brien".
function capitalizar(palabra: string): string {
  return palabra
    .toLowerCase()
    .replace(/(^|[-'’])(\p{L})/gu, (_, sep: string, letra: string) => sep + letra.toUpperCase());
}

/**
 * Deja un nombre o apellido con el formato de nombre propio ("Ana Paula Briceño").
 * Respeta lo que ya está bien escrito y solo corrige las palabras TODO EN MAYÚSCULAS, todo
 * en minúsculas o con mayúsculas raras. Las partículas (de, del, la, las, los, y) quedan en
 * minúscula salvo al inicio. Quita espacios de más.
 */
export function formatoNombre<T extends string | null | undefined>(texto: T): T {
  if (texto == null) return texto;
  const palabras = String(texto).trim().split(/\s+/);
  const resultado = palabras
    .map((w, i) => {
      if (CAPITALIZADA.test(w)) return w; // ya está bien ("De", "Sousa", "Mantilla")
      if (/^\p{Lu}\.?$/u.test(w)) return w; // inicial ("S", "S.")
      if (/^\p{Ll}+$/u.test(w) && PARTICULAS.has(w) && i > 0) return w; // "de" ya en minúscula
      const bajo = w.toLowerCase();
      if (PARTICULAS.has(bajo) && i > 0) return bajo;
      return capitalizar(w);
    })
    .join(" ");
  return resultado as T;
}
