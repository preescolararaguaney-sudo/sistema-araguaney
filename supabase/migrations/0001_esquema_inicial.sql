-- ============================================================================
-- Sistema Administrativo Preescolar Araguaney — Esquema inicial
-- ============================================================================
-- Convenciones:
--   - Dinero en USD: numeric(10,2). Dinero en Bs: numeric(14,2). Tasa BCV: numeric(10,4).
--   - Todas las fechas de negocio (vencimientos, inscripciones) son DATE (sin hora).
--   - Todo timestamp de auditoría es TIMESTAMPTZ, generado en UTC; la conversión a
--     America/Caracas se hace en la capa de presentación, nunca se guarda en hora local.
--   - Nada se borra con DELETE desde la aplicación: se anula con motivo (columna
--     `anulado` + `motivo_anulacion`). Los privilegios DELETE se revocan más abajo.
-- ============================================================================

create extension if not exists "pgcrypto"; -- para gen_random_uuid()

-- ============================================================================
-- 1. ROLES Y USUARIOS
-- ============================================================================
-- `perfiles` extiende auth.users de Supabase (no se duplica email/password aquí).

-- 'docente' queda reservado en el enum (Postgres no permite quitar valores
-- una vez creados) pero no se usa: solo directivos y el gerente entran al
-- sistema, así que ningún flujo de la app asigna ni ofrece este valor.
create type rol_usuario as enum ('directora', 'administracion', 'docente');

create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre_completo text not null,
  rol rol_usuario not null,
  trabajador_id uuid null, -- FK añadida más abajo tras crear `trabajadores` (evita orden circular)
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

comment on table perfiles is 'Extiende auth.users con rol y datos de la app. Solo la directora puede crear/editar perfiles (regla de negocio, aplicada por RLS).';

-- ============================================================================
-- 2. BITÁCORA DE AUDITORÍA
-- ============================================================================

create type accion_bitacora as enum ('crear', 'modificar', 'anular');

create table bitacora (
  id uuid primary key default gen_random_uuid(),
  tabla_afectada text not null,
  registro_id uuid not null,
  accion accion_bitacora not null,
  usuario_id uuid references perfiles(id),
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  motivo text,
  creado_en timestamptz not null default now()
);

comment on table bitacora is 'Registro inmutable de quién hizo qué y cuándo. Se escribe desde triggers y desde la capa de aplicación; nunca se edita ni se borra.';

create index idx_bitacora_tabla_registro on bitacora (tabla_afectada, registro_id);

-- ============================================================================
-- 3. CALENDARIO ESCOLAR: años, lapsos, tasa BCV
-- ============================================================================

create table anios_escolares (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique, -- ej. '2026-2027'
  fecha_inicio date not null,
  fecha_fin date not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  constraint chk_anio_fechas check (fecha_fin > fecha_inicio)
);

-- Los lapsos son configurables por año escolar porque Carnaval/Semana Santa
-- son fiestas móviles: el cierre de cada lapso se corre de un año a otro.
create table lapsos (
  id uuid primary key default gen_random_uuid(),
  anio_escolar_id uuid not null references anios_escolares(id) on delete cascade,
  numero smallint not null check (numero in (1, 2, 3)),
  fecha_inicio date not null,
  fecha_cierre date not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (anio_escolar_id, numero),
  constraint chk_lapso_fechas check (fecha_cierre > fecha_inicio)
);

comment on table lapsos is 'Fechas de cierre editables desde la interfaz. El cierre de lapso 1/2/3 determina el vencimiento de cada parte de la mensualidad fraccionada de agosto (ver plan_pago_items).';

-- Tasa BCV por día. Se carga manualmente; el mecanismo de actualización
-- automática queda como tarea futura opcional (no bloquea el MVP).
create table tasas_bcv (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  tasa numeric(10,4) not null check (tasa > 0),
  fuente text not null default 'manual',
  creado_por uuid references perfiles(id),
  creado_en timestamptz not null default now()
);

-- ============================================================================
-- 4. PRECIOS VERSIONADOS (matrícula / mensualidad por año escolar)
-- ============================================================================
-- Versionado por `vigente_desde` para poder ajustar precios a mitad de año
-- sin alterar planes de pago ya emitidos (regla 9). El plan de pago congela
-- el monto al momento de generarse; esta tabla es solo la "lista de precios".

create type concepto_precio as enum ('matricula', 'mensualidad');

create table precios (
  id uuid primary key default gen_random_uuid(),
  anio_escolar_id uuid not null references anios_escolares(id) on delete cascade,
  concepto concepto_precio not null,
  monto_usd numeric(10,2) not null check (monto_usd > 0),
  vigente_desde date not null,
  creado_por uuid references perfiles(id),
  creado_en timestamptz not null default now()
);

create index idx_precios_busqueda on precios (anio_escolar_id, concepto, vigente_desde desc);

-- ============================================================================
-- 5. AULAS
-- ============================================================================

create table aulas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique, -- ej. 'Maternal A', 'I GRUPO', 'I GRUPO A' (secciones futuras van en el nombre)
  nivel text,
  capacidad integer not null default 0 check (capacidad >= 0),
  activa boolean not null default true,
  creado_en timestamptz not null default now()
);

comment on table aulas is 'Se crean libremente desde la interfaz (botón "nueva aula"); no hay una lista fija en el código. El nombre ya admite secciones (ej. "I GRUPO A") cuando haga falta desdoblar un grupo.';

insert into aulas (nombre, nivel) values
  ('Maternal A', 'Maternal'),
  ('Maternal B', 'Maternal'),
  ('I GRUPO', 'Preescolar'),
  ('II GRUPO', 'Preescolar'),
  ('TERCER GRUPO', 'Preescolar');

-- ============================================================================
-- 6. PERSONAS, ALUMNOS, REPRESENTANTES, AUTORIZADOS
-- ============================================================================
-- `personas` es la tabla genérica de datos de contacto: sirve tanto para
-- padre/madre/representante como para autorizados a retirar, evitando
-- duplicar la misma persona con estructuras distintas.

create table personas (
  id uuid primary key default gen_random_uuid(),
  cedula text unique,
  nombre text not null,
  apellido text not null,
  telefono text,
  email text,
  direccion text,
  creado_en timestamptz not null default now()
);

create table alumnos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellido text not null,
  -- Nullable: en la práctica hay niños en el registro histórico sin fecha
  -- de nacimiento capturada todavía; se completa después en la ficha.
  fecha_nacimiento date,
  datos_medicos text,
  alergias text,
  creado_en timestamptz not null default now()
);

create index idx_alumnos_nombre on alumnos (apellido, nombre);

create type rol_contacto_alumno as enum ('representante_pago', 'padre', 'madre', 'tutor', 'otro');

-- Un alumno puede tener varios contactos (padre, madre, representante de pago);
-- exactamente uno debe estar marcado como responsable de pago.
create table alumno_contactos (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references alumnos(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete restrict,
  rol rol_contacto_alumno not null,
  es_responsable_pago boolean not null default false,
  creado_en timestamptz not null default now(),
  unique (alumno_id, persona_id, rol)
);

create unique index uq_un_responsable_pago_por_alumno
  on alumno_contactos (alumno_id)
  where es_responsable_pago;

create table alumno_autorizados_retiro (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references alumnos(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete restrict,
  parentesco text,
  creado_en timestamptz not null default now(),
  unique (alumno_id, persona_id)
);

-- ============================================================================
-- 7. MATRÍCULA (inscripción de un alumno en un año escolar)
-- ============================================================================

create type estado_matricula as enum ('preinscrito', 'inscrito', 'retirado', 'egresado');

create table matriculas (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references alumnos(id) on delete restrict,
  anio_escolar_id uuid not null references anios_escolares(id) on delete restrict,
  aula_id uuid not null references aulas(id) on delete restrict,
  estado estado_matricula not null default 'preinscrito',
  fecha_inscripcion date not null default current_date,
  fecha_retiro date,
  motivo_retiro text,
  creado_en timestamptz not null default now(),
  unique (alumno_id, anio_escolar_id)
);

create index idx_matriculas_aula_anio on matriculas (aula_id, anio_escolar_id);

-- Monto mensual pactado por alumno (regla 7): lo que manda es el monto acordado
-- en USD, NO un porcentaje recalculado. Se guarda con historial porque el
-- descuento puede empezar a aplicar desde un mes específico, no necesariamente
-- desde el inicio del año escolar.
create table alumno_precios_pactados (
  id uuid primary key default gen_random_uuid(),
  matricula_id uuid not null references matriculas(id) on delete cascade,
  monto_mensual_usd numeric(10,2) not null check (monto_mensual_usd > 0),
  motivo text not null, -- 'hermano', 'beca', 'exoneracion', etc.
  autorizado_por uuid references perfiles(id),
  vigente_desde_mes date not null, -- primer día del mes desde el que aplica
  creado_en timestamptz not null default now()
);

create index idx_alumno_precios_pactados on alumno_precios_pactados (matricula_id, vigente_desde_mes desc);

-- ============================================================================
-- 8. PLAN DE PAGOS (cuotas)
-- ============================================================================
-- Al inscribir, se genera automáticamente: 1 matrícula + 11 mensualidades
-- (sep..jul) + 3 partes de la mensualidad de agosto (regla 5), cada una con
-- su propio vencimiento y estado, pero vinculadas por `mes_referencia` y
-- `tipo` para que el estado de cuenta las agrupe como "mensualidad de agosto".
--
-- `estado` solo distingue pendiente / parcial / pagado, y se mantiene por
-- trigger a partir de los pagos aplicados (ver sección 9). "Vencido" NO se
-- guarda: se calcula en el momento (fecha_vencimiento < hoy y no está pagada),
-- así nunca queda desactualizado y no depende de un job programado.

create type tipo_cuota as enum ('matricula', 'mensualidad', 'mensualidad_agosto');
create type estado_cuota as enum ('pendiente', 'parcial', 'pagado');

create table plan_pago_items (
  id uuid primary key default gen_random_uuid(),
  matricula_id uuid not null references matriculas(id) on delete restrict,
  tipo tipo_cuota not null,
  parte_numero smallint check (parte_numero between 1 and 3), -- solo para mensualidad_agosto
  mes_referencia date, -- primer día del mes que representa (null para matrícula)
  descripcion text not null,
  monto_usd numeric(10,2) not null check (monto_usd > 0),
  fecha_vencimiento date not null,
  lapso_id uuid references lapsos(id), -- solo para las partes de agosto
  estado estado_cuota not null default 'pendiente',
  monto_usd_pagado numeric(10,2) not null default 0,
  creado_en timestamptz not null default now(),
  constraint chk_parte_solo_agosto check (
    (tipo = 'mensualidad_agosto' and parte_numero is not null)
    or (tipo <> 'mensualidad_agosto' and parte_numero is null)
  )
);

create index idx_plan_items_matricula on plan_pago_items (matricula_id);
create index idx_plan_items_estado on plan_pago_items (estado, fecha_vencimiento);

comment on column plan_pago_items.monto_usd_pagado is 'Suma desnormalizada de pago_aplicaciones, mantenida por trigger. Evita recalcular SUM() en cada consulta del panel de morosidad.';

-- ============================================================================
-- 9. PAGOS
-- ============================================================================
-- Un pago (`pagos`) es un evento único: representante paga X en una fecha con
-- una tasa BCV congelada. `pago_aplicaciones` distribuye ese monto entre una o
-- varias cuotas de `plan_pago_items` (permite abonos parciales y pagos que
-- cubren varios meses de una vez — regla 3).
--
-- La tasa se COPIA (no solo se referencia) al momento del pago: si alguien
-- corrige `tasas_bcv` después, los pagos históricos no se alteran (regla 1).

create type metodo_pago as enum (
  'transferencia_bs', 'pago_movil', 'efectivo_bs', 'efectivo_usd', 'zelle', 'otro'
);

create sequence recibo_numero_seq start 1;

create table pagos (
  id uuid primary key default gen_random_uuid(),
  numero_recibo bigint not null unique default nextval('recibo_numero_seq'),
  matricula_id uuid not null references matriculas(id) on delete restrict,
  fecha_pago date not null default current_date,
  monto_usd_total numeric(10,2) not null check (monto_usd_total > 0),
  tasa_bcv_id uuid references tasas_bcv(id), -- trazabilidad; puede quedar null si se borra la fila histórica de tasas
  tasa_bcv_valor numeric(10,4) not null check (tasa_bcv_valor > 0), -- congelada, es la que manda
  monto_bs_total numeric(14,2) generated always as (monto_usd_total * tasa_bcv_valor) stored,
  metodo metodo_pago not null,
  referencia text,
  comprobante_url text,
  anulado boolean not null default false,
  motivo_anulacion text,
  registrado_por uuid not null references perfiles(id),
  creado_en timestamptz not null default now(),
  constraint chk_anulacion_con_motivo check (not anulado or motivo_anulacion is not null)
);

create index idx_pagos_matricula on pagos (matricula_id);
create index idx_pagos_fecha on pagos (fecha_pago);

create table pago_aplicaciones (
  id uuid primary key default gen_random_uuid(),
  pago_id uuid not null references pagos(id) on delete restrict,
  plan_item_id uuid not null references plan_pago_items(id) on delete restrict,
  monto_usd_aplicado numeric(10,2) not null check (monto_usd_aplicado > 0),
  creado_en timestamptz not null default now()
);

create index idx_pago_aplicaciones_pago on pago_aplicaciones (pago_id);
create index idx_pago_aplicaciones_item on pago_aplicaciones (plan_item_id);

-- ============================================================================
-- 10. PERSONAL
-- ============================================================================

create table cargos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

insert into cargos (nombre) values
  ('Directora'), ('Coordinadora'), ('Gerente Administrativo'),
  ('Asistente Administrativo'), ('Docente'), ('Auxiliar de Aula'),
  ('Personal de Mantenimiento');

create type estado_trabajador as enum ('activo', 'inactivo', 'reposo', 'vacaciones', 'permiso');

create table trabajadores (
  id uuid primary key default gen_random_uuid(),
  cedula text not null unique,
  nombre text not null,
  apellido text not null,
  telefono text,
  direccion text,
  cargo_id uuid not null references cargos(id) on delete restrict,
  fecha_ingreso date not null,
  fecha_egreso date,
  tipo_contrato text not null default 'indefinido',
  -- Compensación TOTAL objetivo en USD (lo que realmente recibe el
  -- trabajador al mes, ej. 250 = 125 quincenales). No es el salario que se
  -- declara legalmente — ver `salario_formal_mensual_bs`.
  salario_base_mensual numeric(12,2) not null check (salario_base_mensual >= 0),
  -- Salario formal/legal, normalmente mucho menor que el anterior: es la
  -- base sobre la que se calculan IVSS/RPE/FAOV en el recibo oficial de
  -- nómina. Va en BOLÍVARES (no USD): está atado al salario mínimo legal,
  -- que el gobierno fija en Bs y no se reconvierte con la tasa del día — a
  -- diferencia del bono, que sí se calcula en USD a la tasa de cada
  -- quincena. El resto de la compensación se paga como ese bono, sin
  -- retención.
  salario_formal_mensual_bs numeric(12,2) check (salario_formal_mensual_bs >= 0),
  banco text,
  numero_cuenta text,
  estado estado_trabajador not null default 'activo',
  creado_en timestamptz not null default now()
);

create index idx_trabajadores_cargo on trabajadores (cargo_id);

alter table perfiles
  add constraint fk_perfiles_trabajador foreign key (trabajador_id) references trabajadores(id);

-- Asignación de personal a un aula (ej. Maria = titular de Maternal A,
-- Francisca = auxiliar de Maternal A). Con historial (`vigente_desde` /
-- `vigente_hasta`, en vez de borrar) para poder calcular rentabilidad por
-- salón período a período: ingresos de esa aula (vía matriculas.aula_id →
-- plan_pago_items → pagos) contra el costo del personal asignado en ese
-- mismo período.
create type rol_en_aula as enum ('titular', 'auxiliar', 'apoyo');

create table trabajador_aulas (
  id uuid primary key default gen_random_uuid(),
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  aula_id uuid not null references aulas(id) on delete cascade,
  rol_en_aula rol_en_aula not null default 'titular',
  vigente_desde date not null default current_date,
  vigente_hasta date,
  creado_en timestamptz not null default now(),
  constraint chk_trabajador_aula_fechas check (vigente_hasta is null or vigente_hasta >= vigente_desde)
);

create index idx_trabajador_aulas_aula on trabajador_aulas (aula_id);
create index idx_trabajador_aulas_trabajador on trabajador_aulas (trabajador_id);

create type tipo_novedad_personal as enum ('reposo', 'permiso', 'vacaciones');

create table trabajador_novedades (
  id uuid primary key default gen_random_uuid(),
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  tipo tipo_novedad_personal not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  motivo text,
  soporte_url text,
  creado_por uuid references perfiles(id),
  creado_en timestamptz not null default now(),
  constraint chk_novedad_fechas check (fecha_fin >= fecha_inicio)
);

-- ============================================================================
-- 11. PROVEEDORES / HONORARIOS PROFESIONALES (fuera de nómina)
-- ============================================================================
-- Regla 13: los servicios contables se pagan por honorarios, no por nómina.
-- Van fuera del cálculo de deducciones de ley pero visibles en egresos.

create table proveedores_servicios (
  id uuid primary key default gen_random_uuid(),
  nombre_o_razon_social text not null,
  rif_o_cedula text,
  tipo_servicio text not null, -- ej. 'Contabilidad'
  contacto text,
  creado_en timestamptz not null default now()
);

create table pagos_honorarios (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references proveedores_servicios(id) on delete restrict,
  concepto text not null,
  periodo_referencia text, -- ej. 'Agosto 2026'
  monto numeric(12,2) not null check (monto > 0),
  moneda text not null default 'USD',
  fecha_pago date not null default current_date,
  metodo metodo_pago not null,
  referencia text,
  comprobante_url text,
  anulado boolean not null default false,
  motivo_anulacion text,
  registrado_por uuid not null references perfiles(id),
  creado_en timestamptz not null default now(),
  constraint chk_honorario_anulacion check (not anulado or motivo_anulacion is not null)
);

-- ============================================================================
-- 12. NÓMINA
-- ============================================================================

-- Parámetros de ley versionados por fecha de vigencia (regla del prompt: nada
-- de porcentajes/topes quemados en código). `verificado_por_contador` deja
-- explícito qué valores el usuario aún debe confirmar antes de usarse en
-- producción — se define la estructura ahora; se puebla en la Fase 4 una vez
-- confirmados los valores vigentes.
create table parametros_nomina (
  id uuid primary key default gen_random_uuid(),
  clave text not null, -- ej. 'ivss_pct_trabajador', 'salario_minimo', 'valor_cestaticket_unidad'
  valor numeric(14,6) not null,
  descripcion text,
  fuente text,
  verificado_por_contador boolean not null default false,
  vigente_desde date not null,
  vigente_hasta date,
  creado_por uuid references perfiles(id),
  creado_en timestamptz not null default now()
);

create index idx_parametros_nomina_clave on parametros_nomina (clave, vigente_desde desc);

-- Tramos de ISLR (tabla progresiva) — estructura separada porque no es un
-- único valor sino una tabla de tarifas por tramo de ingreso.
create table parametros_islr_tramos (
  id uuid primary key default gen_random_uuid(),
  vigente_desde date not null,
  tramo_desde numeric(14,2) not null,
  tramo_hasta numeric(14,2), -- null = sin tope superior
  tarifa_pct numeric(5,2) not null,
  sustraendo numeric(14,2) not null default 0,
  creado_en timestamptz not null default now()
);

create type estado_periodo_nomina as enum ('abierto', 'cerrado', 'pagado');

create table periodos_nomina (
  id uuid primary key default gen_random_uuid(),
  anio integer not null,
  mes smallint not null check (mes between 1 and 12),
  quincena smallint not null check (quincena in (1, 2)),
  fecha_inicio date not null,
  fecha_fin date not null,
  estado estado_periodo_nomina not null default 'abierto',
  creado_en timestamptz not null default now(),
  unique (anio, mes, quincena)
);

create type tipo_concepto_nomina as enum ('asignacion', 'deduccion');

create table nomina_conceptos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique, -- ej. 'salario_base', 'cestaticket', 'ivss', 'faov', 'inces', 'islr'
  nombre text not null,
  tipo tipo_concepto_nomina not null,
  es_de_ley boolean not null default false
);

create table recibos_nomina (
  id uuid primary key default gen_random_uuid(),
  trabajador_id uuid not null references trabajadores(id) on delete restrict,
  periodo_nomina_id uuid not null references periodos_nomina(id) on delete restrict,
  tasa_bcv_valor numeric(10,4) not null check (tasa_bcv_valor > 0),
  dias_trabajados numeric(4,1) not null default 10,
  dias_descanso numeric(4,1) not null default 5,
  total_asignaciones numeric(12,2) not null default 0,
  total_deducciones numeric(12,2) not null default 0,
  neto_pagar numeric(12,2) not null default 0,
  anulado boolean not null default false,
  motivo_anulacion text,
  generado_por uuid references perfiles(id),
  creado_en timestamptz not null default now(),
  unique (trabajador_id, periodo_nomina_id),
  constraint chk_recibo_anulacion check (not anulado or motivo_anulacion is not null)
);

create table nomina_detalle (
  id uuid primary key default gen_random_uuid(),
  recibo_nomina_id uuid not null references recibos_nomina(id) on delete cascade,
  concepto_id uuid not null references nomina_conceptos(id) on delete restrict,
  monto numeric(12,2) not null,
  base_calculo numeric(12,2),
  creado_en timestamptz not null default now()
);

create index idx_nomina_detalle_recibo on nomina_detalle (recibo_nomina_id);

insert into nomina_conceptos (codigo, nombre, tipo, es_de_ley) values
  ('salario_formal', 'Salario básico por días trabajados y descanso', 'asignacion', true),
  ('bono', 'Bono complementario', 'asignacion', false),
  ('cestaticket', 'Cestaticket', 'asignacion', false),
  ('ivss', 'Seguro Social Obligatorio', 'deduccion', true),
  ('rpe', 'Régimen Prestacional de Empleo', 'deduccion', true),
  ('faov', 'Fondo de Ahorro Obligatorio para la Vivienda', 'deduccion', true);

-- Valores tomados directamente de la plantilla de recibo de nómina que ya
-- usa el plantel (confirmados por el usuario, no un valor genérico de
-- internet). ISLR no se retiene a ningún trabajador actualmente.
insert into parametros_nomina (clave, valor, descripcion, fuente, verificado_por_contador, vigente_desde) values
  ('ivss_pct_trabajador', 0.04, 'Retención de Seguro Social Obligatorio al trabajador', 'Plantilla de recibo de nómina del plantel', true, '2026-01-01'),
  ('rpe_pct_trabajador', 0.005, 'Retención de Régimen Prestacional de Empleo al trabajador', 'Plantilla de recibo de nómina del plantel', true, '2026-01-01'),
  ('faov_pct_trabajador', 0.01, 'Retención de Fondo de Ahorro Obligatorio para la Vivienda', 'Plantilla de recibo de nómina del plantel', true, '2026-01-01'),
  ('cestaticket_monto_usd', 40.00, 'Cestaticket mensual, pagado a la tasa del día 5', 'Confirmado por el usuario', true, '2026-01-01');

-- ============================================================================
-- 13. FUNCIÓN: generar plan de pagos al inscribir un alumno
-- ============================================================================
-- Implementa las reglas 4, 5 y 7: matrícula + 11 mensualidades (sep-jul) +
-- 3 partes de agosto, usando los precios vigentes y el monto pactado por
-- alumno (si existe) para cada mes.

create or replace function generar_plan_pago(p_matricula_id uuid)
returns void
language plpgsql
as $$
declare
  v_matricula matriculas%rowtype;
  v_anio anios_escolares%rowtype;
  v_lapso1 lapsos%rowtype;
  v_lapso2 lapsos%rowtype;
  v_lapso3 lapsos%rowtype;
  v_precio_matricula numeric(10,2);
  v_precio_mensualidad_base numeric(10,2);
  v_mes_iter date;
  v_monto_mes numeric(10,2);
  v_nombre_mes text;
  v_monto_agosto numeric(10,2);
  v_parte1 numeric(10,2);
  v_parte2 numeric(10,2);
  v_parte3 numeric(10,2);
  v_mes_agosto date;
begin
  select * into v_matricula from matriculas where id = p_matricula_id;
  if not found then
    raise exception 'Matrícula % no existe', p_matricula_id;
  end if;

  select * into v_anio from anios_escolares where id = v_matricula.anio_escolar_id;

  select * into v_lapso1 from lapsos where anio_escolar_id = v_anio.id and numero = 1;
  select * into v_lapso2 from lapsos where anio_escolar_id = v_anio.id and numero = 2;
  select * into v_lapso3 from lapsos where anio_escolar_id = v_anio.id and numero = 3;
  if v_lapso1.id is null or v_lapso2.id is null or v_lapso3.id is null then
    raise exception 'El año escolar % no tiene los 3 lapsos configurados', v_anio.nombre;
  end if;

  -- Se toma el precio más reciente configurado para este año escolar, SIN
  -- compararlo contra la fecha de hoy: la matrícula suele registrarse antes
  -- de que arranque el año escolar (ej. inscribir en agosto para septiembre),
  -- así que "vigente_desde <= current_date" descartaría el precio correcto.
  -- El monto queda congelado en el plan al generarse (regla 9): un cambio de
  -- precio posterior no altera planes ya emitidos, solo los nuevos.
  select monto_usd into v_precio_matricula
    from precios
   where anio_escolar_id = v_anio.id and concepto = 'matricula'
   order by vigente_desde desc limit 1;

  select monto_usd into v_precio_mensualidad_base
    from precios
   where anio_escolar_id = v_anio.id and concepto = 'mensualidad'
   order by vigente_desde desc limit 1;

  if v_precio_matricula is null or v_precio_mensualidad_base is null then
    raise exception 'Faltan precios vigentes de matrícula/mensualidad para el año escolar %', v_anio.nombre;
  end if;

  -- Matrícula
  insert into plan_pago_items (matricula_id, tipo, mes_referencia, descripcion, monto_usd, fecha_vencimiento)
  values (p_matricula_id, 'matricula', null, 'Matrícula ' || v_anio.nombre, v_precio_matricula, v_matricula.fecha_inscripcion);

  -- 11 mensualidades: septiembre del año de inicio hasta julio del año de cierre
  v_mes_iter := date_trunc('month', v_anio.fecha_inicio)::date; -- septiembre
  for i in 1..11 loop
    v_monto_mes := coalesce(
      (select monto_mensual_usd from alumno_precios_pactados
        where matricula_id = p_matricula_id and vigente_desde_mes <= v_mes_iter
        order by vigente_desde_mes desc limit 1),
      v_precio_mensualidad_base
    );
    -- Nombre del mes en español, sin depender del locale del servidor
    -- Postgres (to_char('TMMonth') devuelve el nombre en inglés si el
    -- servidor no tiene un locale es_ES instalado, como ocurre en Supabase).
    v_nombre_mes := (array['Enero','Febrero','Marzo','Abril','Mayo','Junio',
      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'])[extract(month from v_mes_iter)::int]
      || ' ' || extract(year from v_mes_iter)::text;
    insert into plan_pago_items (matricula_id, tipo, mes_referencia, descripcion, monto_usd, fecha_vencimiento)
    values (
      p_matricula_id, 'mensualidad', v_mes_iter,
      'Mensualidad ' || v_nombre_mes,
      v_monto_mes,
      (v_mes_iter + interval '9 days')::date -- vence el día 10 del mes
    );
    v_mes_iter := (v_mes_iter + interval '1 month')::date;
  end loop;

  -- Mensualidad de agosto, fraccionada en 3 partes (regla 5). El monto base
  -- de agosto también respeta el precio pactado por alumno si aplica.
  v_mes_agosto := date_trunc('month', v_anio.fecha_fin)::date; -- agosto del año de cierre
  v_monto_agosto := coalesce(
    (select monto_mensual_usd from alumno_precios_pactados
      where matricula_id = p_matricula_id and vigente_desde_mes <= v_mes_agosto
      order by vigente_desde_mes desc limit 1),
    v_precio_mensualidad_base
  );
  v_parte1 := round(v_monto_agosto / 3, 2);
  v_parte2 := round(v_monto_agosto / 3, 2);
  v_parte3 := v_monto_agosto - v_parte1 - v_parte2; -- ajusta el redondeo en la 3ra parte

  insert into plan_pago_items (matricula_id, tipo, parte_numero, mes_referencia, descripcion, monto_usd, fecha_vencimiento, lapso_id)
  values
    (p_matricula_id, 'mensualidad_agosto', 1, v_mes_agosto, 'Mensualidad Agosto ' || v_anio.nombre || ' (1/3)', v_parte1, v_lapso1.fecha_cierre, v_lapso1.id),
    (p_matricula_id, 'mensualidad_agosto', 2, v_mes_agosto, 'Mensualidad Agosto ' || v_anio.nombre || ' (2/3)', v_parte2, v_lapso2.fecha_cierre, v_lapso2.id),
    (p_matricula_id, 'mensualidad_agosto', 3, v_mes_agosto, 'Mensualidad Agosto ' || v_anio.nombre || ' (3/3)', v_parte3, v_lapso3.fecha_cierre, v_lapso3.id);
end;
$$;

comment on function generar_plan_pago is 'Genera matrícula + 11 mensualidades + 3 partes de agosto para una matrícula. Se invoca una vez al inscribir; no se re-ejecuta si ya existen items (la app debe validar eso antes de llamarla).';

-- ============================================================================
-- 14. TRIGGERS
-- ============================================================================

-- 14.1 Recalcula vencimientos de cuotas de agosto cuando cambia el cierre de
-- un lapso (regla 6): solo toca cuotas NO pagadas ni parciales, y deja
-- constancia en bitácora.
create or replace function trg_fn_recalcular_vencimientos_agosto()
returns trigger
language plpgsql
as $$
begin
  if new.fecha_cierre is distinct from old.fecha_cierre then
    update plan_pago_items
       set fecha_vencimiento = new.fecha_cierre
     where lapso_id = new.id
       and estado = 'pendiente';

    insert into bitacora (tabla_afectada, registro_id, accion, usuario_id, datos_anteriores, datos_nuevos, motivo)
    values (
      'lapsos', new.id, 'modificar', auth.uid(),
      jsonb_build_object('fecha_cierre', old.fecha_cierre),
      jsonb_build_object('fecha_cierre', new.fecha_cierre),
      'Recálculo automático de vencimientos de cuotas de agosto pendientes'
    );
  end if;
  return new;
end;
$$;

create trigger trg_recalcular_vencimientos
  after update on lapsos
  for each row execute function trg_fn_recalcular_vencimientos_agosto();

-- 14.2 Mantiene monto_usd_pagado y estado de plan_pago_items cuando se
-- inserta/borra una aplicación de pago (aplica también al anular un pago,
-- que se modela como DELETE de sus aplicaciones, ver sección 15).
create or replace function trg_fn_actualizar_estado_cuota()
returns trigger
language plpgsql
as $$
declare
  v_item_id uuid;
  v_total_aplicado numeric(10,2);
  v_monto numeric(10,2);
begin
  v_item_id := coalesce(new.plan_item_id, old.plan_item_id);

  select coalesce(sum(pa.monto_usd_aplicado), 0) into v_total_aplicado
    from pago_aplicaciones pa
    join pagos p on p.id = pa.pago_id
   where pa.plan_item_id = v_item_id and not p.anulado;

  select monto_usd into v_monto from plan_pago_items where id = v_item_id;

  update plan_pago_items
     set monto_usd_pagado = v_total_aplicado,
         estado = (case
           when v_total_aplicado >= v_monto then 'pagado'
           when v_total_aplicado > 0 then 'parcial'
           else 'pendiente'
         end)::estado_cuota
   where id = v_item_id;

  return coalesce(new, old);
end;
$$;

create trigger trg_actualizar_estado_cuota_insert
  after insert on pago_aplicaciones
  for each row execute function trg_fn_actualizar_estado_cuota();

create trigger trg_actualizar_estado_cuota_delete
  after delete on pago_aplicaciones
  for each row execute function trg_fn_actualizar_estado_cuota();

-- 14.3 Cuando se anula un pago, sus cuotas deben volver a reflejar el estado
-- real (el trigger de arriba solo mira pagos no anulados, así que basta con
-- "tocar" las aplicaciones para forzar el recálculo).
create or replace function trg_fn_anular_pago()
returns trigger
language plpgsql
as $$
begin
  if new.anulado and not old.anulado then
    update plan_pago_items
       set estado = (case
             when (select coalesce(sum(pa.monto_usd_aplicado), 0) from pago_aplicaciones pa
                     join pagos p on p.id = pa.pago_id
                    where pa.plan_item_id = plan_pago_items.id and not p.anulado) >= monto_usd
               then 'pagado'
             when (select coalesce(sum(pa.monto_usd_aplicado), 0) from pago_aplicaciones pa
                     join pagos p on p.id = pa.pago_id
                    where pa.plan_item_id = plan_pago_items.id and not p.anulado) > 0
               then 'parcial'
             else 'pendiente'
           end)::estado_cuota,
           monto_usd_pagado = (select coalesce(sum(pa.monto_usd_aplicado), 0) from pago_aplicaciones pa
                                  join pagos p on p.id = pa.pago_id
                                 where pa.plan_item_id = plan_pago_items.id and not p.anulado)
     where id in (select plan_item_id from pago_aplicaciones where pago_id = new.id);

    insert into bitacora (tabla_afectada, registro_id, accion, usuario_id, datos_nuevos, motivo)
    values ('pagos', new.id, 'anular', auth.uid(), jsonb_build_object('anulado', true), new.motivo_anulacion);
  end if;
  return new;
end;
$$;

create trigger trg_anular_pago
  after update on pagos
  for each row execute function trg_fn_anular_pago();

-- ============================================================================
-- 15. PERMISOS A NIVEL DE BASE DE DATOS: nada se borra
-- ============================================================================
-- Se revoca DELETE del rol usado por la app autenticada; anular = UPDATE con
-- `anulado = true` + motivo. (Los roles concretos de Supabase, p.ej.
-- `authenticated`, se ajustan aquí; `service_role` conserva acceso total
-- para migraciones/soporte.)

revoke delete on pagos, pago_aplicaciones, pagos_honorarios, recibos_nomina, nomina_detalle,
  plan_pago_items, matriculas, alumnos, trabajadores, trabajador_aulas, bitacora
  from authenticated;

-- ============================================================================
-- 16. ROW LEVEL SECURITY
-- ============================================================================

create or replace function auth_rol()
returns rol_usuario
language sql
stable
security definer
set search_path = public
as $$
  select rol from perfiles where id = auth.uid();
$$;

alter table perfiles enable row level security;
alter table bitacora enable row level security;
alter table anios_escolares enable row level security;
alter table lapsos enable row level security;
alter table tasas_bcv enable row level security;
alter table precios enable row level security;
alter table aulas enable row level security;
alter table trabajador_aulas enable row level security;
alter table personas enable row level security;
alter table alumnos enable row level security;
alter table alumno_contactos enable row level security;
alter table alumno_autorizados_retiro enable row level security;
alter table matriculas enable row level security;
alter table alumno_precios_pactados enable row level security;
alter table plan_pago_items enable row level security;
alter table pagos enable row level security;
alter table pago_aplicaciones enable row level security;
alter table cargos enable row level security;
alter table trabajadores enable row level security;
alter table trabajador_novedades enable row level security;
alter table proveedores_servicios enable row level security;
alter table pagos_honorarios enable row level security;
alter table parametros_nomina enable row level security;
alter table parametros_islr_tramos enable row level security;
alter table periodos_nomina enable row level security;
alter table nomina_conceptos enable row level security;
alter table recibos_nomina enable row level security;
alter table nomina_detalle enable row level security;

-- --- Perfiles: cada quien ve el suyo; solo la directora ve/gestiona todos ---
create policy perfiles_propio_select on perfiles for select
  using (id = auth.uid() or auth_rol() = 'directora');
create policy perfiles_directora_todo on perfiles for all
  using (auth_rol() = 'directora') with check (auth_rol() = 'directora');

-- --- Bitácora: solo lectura, solo directora ---
create policy bitacora_directora_select on bitacora for select
  using (auth_rol() = 'directora');

-- --- Catálogos / calendario: directora y administración gestionan ---
create policy anios_escolares_lectura on anios_escolares for select using (true);
create policy anios_escolares_escritura on anios_escolares for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));

create policy lapsos_lectura on lapsos for select using (true);
create policy lapsos_escritura on lapsos for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));

create policy tasas_bcv_lectura on tasas_bcv for select
  using (auth_rol() in ('directora', 'administracion'));
create policy tasas_bcv_escritura on tasas_bcv for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));

create policy precios_lectura on precios for select
  using (auth_rol() in ('directora', 'administracion'));
create policy precios_escritura on precios for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));

create policy aulas_lectura on aulas for select using (true);
create policy aulas_escritura on aulas for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));

create policy trabajador_aulas_finanzas on trabajador_aulas for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));

-- --- Alumnos / personas / contactos: solo directora y administración
--     (las docentes no tienen acceso al sistema) ---
create policy alumnos_admin_todo on alumnos for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));

create policy personas_admin_todo on personas for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));

create policy alumno_contactos_admin_todo on alumno_contactos for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));

create policy autorizados_admin_todo on alumno_autorizados_retiro for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));

create policy matriculas_admin_todo on matriculas for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));

-- --- Financiero (cobranza): solo directora y administración ---
create policy alumno_precios_pactados_finanzas on alumno_precios_pactados for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));
create policy plan_pago_items_finanzas on plan_pago_items for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));
create policy pagos_finanzas on pagos for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));
create policy pago_aplicaciones_finanzas on pago_aplicaciones for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));

-- --- Personal y nómina: solo directora y administración ---
create policy cargos_lectura on cargos for select
  using (auth_rol() in ('directora', 'administracion'));
create policy trabajadores_finanzas on trabajadores for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));
create policy trabajador_novedades_finanzas on trabajador_novedades for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));
create policy proveedores_servicios_finanzas on proveedores_servicios for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));
create policy pagos_honorarios_finanzas on pagos_honorarios for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));
create policy parametros_nomina_finanzas on parametros_nomina for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));
create policy parametros_islr_finanzas on parametros_islr_tramos for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));
create policy periodos_nomina_finanzas on periodos_nomina for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));
create policy nomina_conceptos_lectura on nomina_conceptos for select
  using (auth_rol() in ('directora', 'administracion'));
create policy recibos_nomina_finanzas on recibos_nomina for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));
create policy nomina_detalle_finanzas on nomina_detalle for all
  using (auth_rol() in ('directora', 'administracion')) with check (auth_rol() in ('directora', 'administracion'));

-- ============================================================================
-- Fin del esquema inicial.
-- ============================================================================
