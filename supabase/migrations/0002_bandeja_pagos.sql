-- Bandeja de pagos recibidos por Telegram (2026-11). Ejecutar una vez en el SQL Editor de Supabase.
create table pagos_pendientes (
  id uuid primary key default gen_random_uuid(),
  origen text not null default 'telegram',
  telegram_chat_id bigint,
  telegram_message_id bigint,
  telegram_file_unique_id text,
  enviado_por text,
  nota text,
  comprobante_url text,
  lectura jsonb, -- salida cruda de la IA, para auditar
  monto_bs numeric(14,2),
  fecha_pago date,
  referencia text,
  banco text,
  metodo text,
  emisor_nombre text,
  emisor_cedula text,
  matricula_id uuid references matriculas(id),
  conceptos_sugeridos uuid[] not null default '{}',
  -- Datos para la factura: se prellenan con la madre (o el padre si no hay
  -- madre); si faltan, se completan en el sistema al aprobar (el bot no
  -- hace preguntas, solo recibe los capture).
  factura_nombre text,
  factura_cedula text,
  factura_telefono text,
  factura_direccion text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aprobado', 'rechazado', 'duplicado')),
  pago_id uuid references pagos(id),
  motivo_rechazo text,
  factura_numero text,
  factura_control text,
  creado_en timestamptz not null default now(),
  revisado_por uuid references perfiles(id),
  revisado_en timestamptz,
  unique (telegram_chat_id, telegram_message_id)
);

create index idx_pagos_pendientes_estado on pagos_pendientes (estado, creado_en);

alter table pagos_pendientes enable row level security;
create policy pagos_pendientes_finanzas on pagos_pendientes for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));
