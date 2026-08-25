# Prompt maestro — Sistema Administrativo Preescolar Araguaney

> Cómo usarlo: pega este documento completo como primer mensaje en una sesión nueva (Claude Code, Cowork o chat).
> Los datos reales del plantel están en la sección 10. El documento está completo y listo para usarse.
> Pide que se construya **una fase a la vez** y no avances hasta validar la anterior.

---

## 1. Contexto

Soy el responsable administrativo del **Preescolar Araguaney**, un plantel privado de educación inicial ubicado en Av. Sanz, El Marqués, Caracas, Venezuela. Actualmente la administración se lleva en Excel y hojas sueltas, y ya tengo funcionando un formulario web (Google Apps Script + Google Sheets) donde los representantes cargan sus datos y los de las personas autorizadas a retirar al niño.

Quiero construir un **sistema administrativo web propio**, con su propia base de datos, que centralice la operación del plantel y me dé respuestas en segundos a preguntas como: cuántos niños tengo inscritos, quién debe la mensualidad, cuánto cobré este mes, cuánto personal tengo y qué le toca cobrar en la quincena.

## 2. Objetivo

Una aplicación web en español, accesible desde cualquier lugar (computadora y teléfono), con acceso por usuario y contraseña, que cubra cuatro módulos: **cobranza, alumnos, personal y nómina**.

## 3. Stack y despliegue

- Recomiéndame el stack antes de escribir código y espera mi confirmación. Mi preferencia de partida: **Next.js (React) + Supabase** (PostgreSQL, autenticación y Row Level Security) desplegado en Vercel, aprovechando los planes gratuitos.
- La base de datos debe ser relacional y estar bien normalizada. Entrégame el esquema SQL completo (migraciones) antes de la interfaz.
- Todo el texto de la interfaz en español de Venezuela (representante, cédula, mensualidad, quincena, cestaticket).
- Diseño responsive, limpio y sobrio; se usará mucho desde el teléfono.
- Nada de credenciales quemadas en el código: autenticación real por usuario, contraseñas hasheadas, variables de entorno para llaves.

## 4. Roles y permisos

| Rol | Puede |
|---|---|
| **Directora** | Todo: ve finanzas, nómina, alumnos, personal, reportes y auditoría |
| **Administración** | Cobranza, alumnos, personal y nómina; no gestiona usuarios ni borra registros históricos |
| **Docente** | Solo la lista de niños de su aula y sus datos de contacto/autorizados. **Sin acceso a información financiera ni de nómina** |

Toda acción que cree o modifique un pago, un recibo o un registro de nómina debe quedar registrada con usuario, fecha y hora (bitácora de auditoría). Nada se borra: se anula con motivo.

## 5. Reglas de negocio críticas (Venezuela)

Estas reglas son la razón principal por la que Excel se nos queda corto. Respétalas al pie de la letra:

1. **Doble moneda.** La mensualidad se define en **USD**, pero el representante paga en **bolívares a la tasa BCV del día del pago**. Cada pago debe guardar: monto en USD, tasa BCV usada, monto en Bs, fecha, método y referencia. Nunca recalcules pagos históricos con la tasa actual: el histórico se congela con su tasa.
2. **La tasa BCV se registra por día** en una tabla propia. Debe poder cargarse manualmente (y dejar preparado, pero opcional, un mecanismo de actualización automática).
3. **Pagos parciales y abonos**: un mes puede quedar cubierto por varios pagos. El estado de cada mes es *pendiente / parcial / pagado / vencido*.
4. **Plan de pagos del año escolar** (ver montos exactos en la sección 10): al inscribirse, a cada alumno se le genera automáticamente el plan completo del año: la matrícula más las mensualidades de septiembre a agosto, cada una con su fecha de vencimiento.
5. **Cuota de agosto fraccionada** (regla especial, no la simplifiques): agosto es período de vacaciones escolares y su mensualidad **no se cobra en agosto**. Se divide en tres partes iguales que se cobran al cierre de cada lapso del año escolar. El sistema debe modelar esto como tres cuotas independientes, cada una con su propio vencimiento y su propio estado de pago, pero identificadas como partes de la mensualidad de agosto para que el estado de cuenta las muestre agrupadas y el representante entienda qué está pagando.
6. **Los lapsos son configurables por año escolar, no fechas fijas.** En Venezuela el cierre de cada lapso se corre de un año a otro porque Carnaval y Semana Santa son fiestas móviles y el Ministerio ajusta el calendario. Por eso debe existir una tabla de **lapsos por año escolar** (lapso 1, 2 y 3, cada uno con fecha de inicio y fecha de cierre editables desde la interfaz), y los vencimientos de las tres partes de la cuota de agosto deben **derivarse de esas fechas**, no estar escritos en el código. Al cambiar la fecha de cierre de un lapso, el sistema recalcula únicamente los vencimientos **pendientes**: las cuotas ya pagadas o parcialmente pagadas conservan su fecha y su histórico intactos, y el cambio queda registrado en la bitácora.
7. **Descuentos por hermanos**: se acuerdan caso por caso. El porcentaje es referencial (~10%), pero **lo que manda es el monto final acordado en USD**, que se redondea a una cifra limpia. Por eso el sistema debe guardar el **monto mensual pactado por alumno**, no un porcentaje que luego recalcule: si el descuento se guarda como 10% sobre 130, el sistema arrojaría 117 y no coincidiría con lo que realmente cobramos. Guarda el monto acordado, el motivo (hermano, beca, exoneración), quién lo autorizó y desde qué mes aplica.
8. **Vencimiento sin mora**: el pago se recibe dentro de los **primeros 10 días de cada mes**. **No se cobra mora ni recargo por retraso.** Pasado el día 10 la cuota simplemente cambia a estado *vencida* y aparece en el panel de morosidad, sin generar intereses.
9. **Precios versionados por año escolar**: los montos de matrícula y mensualidad deben poder cambiar de un año escolar a otro (y ajustarse a mitad de año si hiciera falta) sin alterar los planes de pago ya emitidos ni los pagos históricos.
10. **Métodos de pago** a soportar: transferencia en Bs, pago móvil, efectivo en Bs, efectivo en USD, Zelle y otros. Con campo de referencia y posibilidad de adjuntar el comprobante.
11. **Recibos**: generar recibo imprimible/PDF de cada pago, con numeración correlativa.
12. **Nómina quincenal**: los períodos son del 01 al 15 y del 16 al último día de cada mes (así se manejan hoy los recibos del personal).
13. **Honorarios profesionales aparte de la nómina**: los servicios contables se pagan por honorarios, no por nómina. Deben registrarse como pago a proveedor/servicio profesional, **fuera del cálculo de deducciones de ley**, pero visibles en los reportes de egresos del plantel.

## 6. Módulos, en orden de construcción

Construye en fases. No empieces la siguiente sin que yo apruebe la anterior.

### Fase 1 — Mensualidades y cobranza (prioridad máxima)
- Registro de pagos con la lógica de doble moneda descrita arriba.
- Estado de cuenta por alumno y **panel de morosidad**: quién debe, cuántos meses y cuánto en USD y Bs.
- Cierre de mes: total cobrado en USD y en Bs, por método de pago.
- Generación e impresión de recibos.
- Exportación a Excel de todo lo anterior.

### Fase 2 — Alumnos e inscripciones
- Ficha del alumno: datos personales, fecha de nacimiento, aula/nivel, representante, padre y madre, personas autorizadas a retirarlo (nombre, cédula, teléfono), datos médicos básicos y alergias.
- Estado: inscrito / preinscrito / retirado / egresado, con año escolar.
- **Importación de los datos ya recogidos** en mi formulario actual de Google Sheets (te entregaré el archivo exportado en CSV).
- Conteo de inscritos por aula y por año escolar, con cupos disponibles.

### Fase 3 — Personal
- Ficha del trabajador: datos personales, cédula, cargo, fecha de ingreso, tipo de contrato, salario base, cuenta bancaria.
- Cargos del plantel: Directora, Coordinadora, Gerente Administrativo, Asistente Administrativo, Docente, Auxiliar de Aula, Personal de Mantenimiento.
- Conteo de personal activo por cargo; control de reposo, permisos y vacaciones.

### Fase 4 — Nómina
- Cálculo quincenal con asignaciones (salario base, bono de alimentación/cestaticket, primas, bonos) y **deducciones de ley venezolanas: IVSS, FAOV (Ley de Régimen Prestacional de Vivienda y Hábitat), INCES y retención de ISLR**.
- Cálculo de **utilidades (aguinaldos), bono vacacional y prestaciones sociales** (garantía trimestral y días adicionales por antigüedad).
- Recibo de pago individual por trabajador, imprimible, y resumen de nómina por período.
- **Muy importante**: los porcentajes, topes, número de lunes por trimestre, salario mínimo y unidad de cálculo del cestaticket **deben estar en una tabla de parámetros editable desde la interfaz, con vigencia por fecha**. En Venezuela estos valores cambian con frecuencia; no los quemes en el código. Antes de implementar, confírmame los valores vigentes que vas a usar y su fuente, y márcame cuáles debo verificar con mi contador.

## 7. Tablero principal (dashboard)

Al entrar, quiero ver de un vistazo: niños inscritos (total y por aula), cobrado del mes en USD y Bs, monto pendiente por cobrar, cantidad de representantes morosos, personal activo por cargo, y monto estimado de la próxima quincena de nómina.

## 8. Requisitos no funcionales

- Exportación a Excel y PDF en todos los reportes.
- Respaldo: exportación completa de la base de datos bajo demanda.
- Búsqueda rápida por nombre del niño, del representante o cédula.
- Manejo correcto de fechas y zona horaria de Caracas (ya tuve un bug de serialización de fechas antes; evítalo).
- Formato de moneda con separadores venezolanos y dos decimales.

## 9. Cómo quiero que trabajemos

- Primero: propuesta de stack y **modelo de datos completo** (tablas, campos, relaciones) para que yo lo revise. No escribas interfaz hasta que apruebe el esquema.
- Explícame el razonamiento detrás de cada decisión técnica antes de ejecutarla; quiero entender el sistema, no solo recibirlo.
- Avanza en pasos pequeños y verificables, y dime en cada paso qué debo probar yo.
- Si algo de este documento es ambiguo o te falta un dato, **pregúntame en lugar de asumir**.

## 10. Datos reales del plantel — año escolar 2026-2027

**Año escolar**: comienza en septiembre de 2026 y el plan de pagos cubre de **septiembre 2026 a agosto 2027**.

**Aranceles (en USD, cobrados en Bs a tasa BCV del día):**

| Concepto | Monto USD | Cuándo se cobra |
|---|---|---|
| Matrícula (inscripción) | 320,00 | Al inscribir |
| Mensualidad septiembre 2026 → julio 2027 (11 cuotas) | 130,00 c/u | Primeros 10 días de cada mes |
| Mensualidad de agosto 2027 | 130,00 total | **Fraccionada en 3 partes iguales** (ver abajo) |

**Total del año escolar por alumno sin descuento: 320 + (130 × 12) = 1.880,00 USD.**

**Fraccionamiento de la cuota de agosto 2027** — tres cuotas de 43,33 USD (la tercera ajusta el redondeo a 43,34 para que sumen exactamente 130,00):

| Parte | Se cobra | Vencimiento |
|---|---|---|
| 1 de 3 | Al cierre del lapso 1 | Diciembre 2026 |
| 2 de 3 | Al cierre del lapso 2 | Abril 2027 (día exacto configurable) |
| 3 de 3 | Al cierre del año escolar | Julio 2027 |

**Volumen actual y proyectado:**
- Aproximadamente **60 niños inscritos**, con meta de llegar a **100-120**. El sistema debe cargar la matrícula existente y seguir creciendo; diseña la carga de alumnos para que sea rápida y masiva (importación desde CSV + registro manual ágil).
- **22 trabajadores** en nómina.

**Descuentos**: por hermanos, alrededor del 10% pero acordado caso a caso y redondeado a cifra limpia (ejemplo real: 130 con 10% daría 117, pero se cobra **120**). Guardar el monto pactado, no el porcentaje.

**Vencimiento**: primeros 10 días del mes, **sin mora**.

**Personal**: los 22 trabajadores están contratados por nómina. **La excepción son los servicios contables**, que se pagan por honorarios profesionales y van fuera del módulo de nómina.
