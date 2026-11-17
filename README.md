# Sistema Araguaney

Sistema administrativo del Preescolar Araguaney: alumnos, inscripción, cobranza,
comprobantes, personal y nómina. Usa Next.js 16, React 19 y Supabase.
Telegram y OpenAI permiten recibir y leer comprobantes de pago.

## Abrir en esta computadora

1. Haz doble clic en `INICIAR-SISTEMA.cmd` dentro de esta carpeta.
2. Cuando aparezca `Ready`, abre http://localhost:3000.
3. Inicia sesión con tu usuario habitual del sistema.

Mantén abierta la ventana mientras lo utilizas. Para detenerlo, pulsa Ctrl+C.
Si el puerto 3000 está ocupado, usa la dirección que indique la ventana.
Este inicio sirve para trabajar en esta computadora; el sitio publicado funciona por separado.

En PowerShell también puedes usar `npm.cmd run dev`. Windows puede bloquear
`npm.ps1`; no hace falta cambiar las políticas de Windows.

## Continuar el trabajo aquí

La carpeta ya contiene el código y `.env.local` con la configuración local.
No hay que exportar desde Claude Code ni crear otra base de datos.
Las instrucciones compartidas están en `AGENTS.md`; `CLAUDE.md` las referencia.
`prompt-sistema-araguaney.md` conserva el planteamiento original, pero puede
diferir de las reglas finalmente implementadas.

Para pedir cambios, describe la pantalla, el resultado esperado y un ejemplo.
La configuración local puede apuntar a la misma base que usa el colegio:
no registres pagos de prueba sin verificar primero ese punto.

## Configuración y servicios

Requiere Node.js 20.9 o posterior y npm. En una instalación nueva ejecuta
`npm.cmd ci`, copia `.env.example` a `.env.local` y completa las variables.
No sobrescribas un `.env.local` existente.

| Variables | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Conexión y autenticación |
| `SUPABASE_SERVICE_ROLE_KEY` | Operaciones del servidor con permisos elevados |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ALLOWED_USER_IDS` | Recepción de comprobantes autorizados |
| `OPENAI_API_KEY` | Lectura automática de comprobantes |
| `OPENAI_MODEL` | Modelo opcional para esa lectura |
| `APP_URL` | Dirección pública para enlaces del bot |

La lectura de comprobantes usa la API de OpenAI. El modelo predeterminado es
`gpt-5.6-terra`, configurable mediante `OPENAI_MODEL`. La clave solo se usa en
el servidor. Se env?an im?genes y PDF directamente, sin crear archivos persistentes
en la API, y se solicita `store: false` para la respuesta.
No compartas claves ni subas `.env.local` al repositorio.

Los usuarios necesitan una cuenta en Supabase Auth y un registro activo en
`perfiles` con rol `directora` o `administracion`. La sesión de Codex no
sustituye el acceso al sistema.

## Base de datos y publicación

Se conserva el proyecto Supabase existente y el despliegue existente, si lo hay.
No ejecutes todas las migraciones sin revisar su estado: `0001` ya incluye
`pagos_pendientes`, que `0002` también intenta crear, y columnas de migraciones
posteriores. No son una secuencia segura para reinstalar automáticamente.
Los comprobantes usan el bucket `comprobantes-pago`; el código genera enlaces públicos.

Para actualizar el sitio publicado, verifica primero qué repositorio y proyecto
de Vercel lo gestionan. Las variables deben estar configuradas allí también.
Conserva el webhook existente de Telegram hasta decidir un cambio de despliegue;
iniciar localmente no lo traslada.

## Comprobaciones

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Para ejecutar la versión compilada: `npm.cmd run start` después de compilar.
Compilar comprueba código y tipos; no demuestra que todas las operaciones con
datos, el bot o la lectura de comprobantes funcionen con las cuentas externas.

## Activar OpenAI

1. Crea una clave de proyecto en https://platform.openai.com/api-keys y verifica
   que tu cuenta tenga acceso y saldo o facturaci?n habilitada para la API.
2. En `.env.local`, completa `OPENAI_API_KEY=` con esa clave. No la pegues en el chat.
3. Reinicia el sistema para cargar la nueva configuraci?n.
4. Para el sitio publicado, configura `OPENAI_API_KEY` y `OPENAI_MODEL` tambi?n
   en Vercel y vuelve a desplegar el c?digo actualizado.
5. Verifica un comprobante de prueba sin aprobar ni registrar un pago real.

Las variables antiguas `ANTHROPIC_API_KEY` y `ANTHROPIC_MODEL` ya no se usan.
No hace falta cambiar Supabase, el bot ni su webhook. Los comprobantes siguen
llegando a la bandeja para revisi?n manual antes de aprobarse.

Referencia: https://developers.openai.com/api/docs/guides/structured-outputs
