-- Precio al pagar en bolívares + datos exactos del pago y de la factura en `pagos`.
-- Ejecutar una vez en el SQL Editor de Supabase. Solo agrega columnas y un dato.

-- 1) Regla de negocio: la mensualidad vale $130 si se paga en dólares y $150 si se
--    paga en bolívares (al BCV del día de la transferencia). El precio en dólares
--    sigue en `monto_usd`; este es el precio equivalente cuando se paga en bolívares.
--    Null = el concepto cuesta lo mismo en cualquier moneda (ej. la matrícula, hasta
--    que se indique lo contrario).
alter table precios
  add column monto_usd_si_paga_en_bs numeric(10,2)
  check (monto_usd_si_paga_en_bs is null or monto_usd_si_paga_en_bs > 0);

comment on column precios.monto_usd_si_paga_en_bs is
  'Precio en USD que se exige cuando el pago se hace en bolívares (convertido con la tasa BCV del día). Null = igual a monto_usd.';

update precios
   set monto_usd_si_paga_en_bs = 150
 where concepto = 'mensualidad' and monto_usd = 130;

-- 2) Lo que de verdad se pagó y a quién se le factura, en el propio pago, para que
--    sirva igual si el pago entró por Telegram, por el formulario público o a mano.
alter table pagos
  add column moneda_pago text check (moneda_pago in ('BS', 'USD')),
  add column monto_bs_pagado numeric(14,2),
  add column banco text,
  add column factura_nombre text,
  add column factura_cedula text,
  add column factura_telefono text,
  add column factura_direccion text,
  add column factura_numero text,
  add column factura_control text;

comment on column pagos.monto_bs_pagado is 'Monto exacto en bolívares que se recibió (solo si moneda_pago = BS).';
