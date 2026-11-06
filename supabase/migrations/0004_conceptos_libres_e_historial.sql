-- Pagos de conceptos que no son cuotas del plan (insignia, fiesta, etc.) y meses que se dan por
-- pagados al registrar un pago posterior (historial previo al sistema).
-- Ejecutar una vez en el SQL Editor de Supabase. Solo agrega columnas.

-- 1) Concepto libre: texto de lo que se pagó cuando NO se aplica a una cuota del plan
--    (ej. "Insignia", "Fiesta de navidad"). Se factura igual, pero no descuenta deuda.
alter table pagos
  add column concepto_libre text;

alter table pagos_pendientes
  add column concepto_libre text;

comment on column pagos.concepto_libre is
  'Texto libre del concepto cuando el pago no se aplica a ninguna cuota del plan (insignia, fiesta...).';

-- 2) Historial: al registrar un pago de un mes (ej. noviembre) se asumen pagados los meses
--    anteriores. Eso se asienta como un pago sintético marcado aquí, para poder excluirlo de
--    los totales de "lo recibido" y distinguirlo en los reportes.
alter table pagos
  add column es_historial boolean not null default false;

comment on column pagos.es_historial is
  'true = pago sintético que da por saldados meses anteriores al sistema; no es dinero recibido.';
