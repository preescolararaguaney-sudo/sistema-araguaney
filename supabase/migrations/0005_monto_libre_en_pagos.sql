-- Pagos con varias partes: una transferencia puede cubrir cuotas (mensualidad, porción de
-- agosto) y además un concepto que no es cuota (fiesta de navidad, helado...). Esta columna
-- guarda cuánto del pago (en USD) corresponde a ese concepto libre; el resto va a las cuotas.
-- Ejecutar una vez en el SQL Editor de Supabase. Solo agrega columnas.

alter table pagos
  add column monto_libre_usd numeric(10,2)
  check (monto_libre_usd is null or monto_libre_usd > 0);

alter table pagos_pendientes
  add column monto_libre_usd numeric(10,2);

comment on column pagos.monto_libre_usd is
  'Parte del pago (USD) que corresponde a concepto_libre. Si no hay cuotas aplicadas, es el pago completo.';
