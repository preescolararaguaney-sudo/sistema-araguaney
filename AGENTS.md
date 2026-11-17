<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Contexto del proyecto

- Sistema administrativo del Preescolar Araguaney, en español de Venezuela.
- Código en `src/app` y `src/lib`; Supabase para datos y autenticación;
  Telegram y OpenAI para comprobantes. Arranque documentado en `README.md`.
- En PowerShell usar `npm.cmd`, evitando el bloqueo de `npm.ps1`.
- Conservar integraciones y reglas actuales al cambiar de asistente.
  `prompt-sistema-araguaney.md` es contexto histórico, no una orden de reconstruir.
- No mostrar secretos de `.env.local` ni incluirlos en documentación o commits.
- La conexión local puede usar datos reales. Validar con lecturas acotadas;
  no crear pagos de prueba ni ejecutar migraciones sin autorización.
- Las migraciones contienen definiciones solapadas: revisar el esquema real
  antes de aplicarlas. No ejecutar toda la carpeta automáticamente.
- Validar con `npm.cmd run lint` y `npm.cmd run build` según corresponda.
