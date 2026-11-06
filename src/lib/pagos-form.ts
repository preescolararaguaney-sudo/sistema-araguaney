import "server-only";

/**
 * Opciones del formulario de pago que no son los campos básicos: concepto libre
 * (insignia, fiesta...), reparto manual entre cuotas y "dar por pagados los meses
 * anteriores". Las leen igual el registro manual y la aprobación de la bandeja.
 */
export function leerOpcionesPago(formData: FormData) {
  const conceptoLibre = String(formData.get("concepto_libre") ?? "").trim() || null;
  const darPorPagadosAnteriores = formData.get("dar_por_pagados_anteriores") === "on";

  const asignaciones: { conceptoId: string; montoUsd: number }[] = [];
  if (formData.get("repartir") === "on") {
    for (const [clave, valor] of formData.entries()) {
      if (!clave.startsWith("asignacion_")) continue;
      const montoUsd = Number(valor);
      if (Number.isFinite(montoUsd) && montoUsd > 0) {
        asignaciones.push({ conceptoId: clave.slice("asignacion_".length), montoUsd });
      }
    }
  }

  return { conceptoLibre, darPorPagadosAnteriores, asignaciones };
}
