@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo No se encontro Node.js. Instala Node.js 20.9 o posterior.
  pause
  exit /b 1
)
if not exist "node_modules\next\package.json" (
  echo Faltan las dependencias. Ejecuta npm.cmd ci dentro de esta carpeta.
  pause
  exit /b 1
)
if not exist ".env.local" (
  echo Falta .env.local. Usa .env.example como plantilla.
  pause
  exit /b 1
)
echo Iniciando Sistema Araguaney...
echo Cuando aparezca Ready, abre http://localhost:3000.
echo Si se indica otro puerto, usa la direccion mostrada.
echo Manten esta ventana abierta. Para detener el sistema, pulsa Ctrl+C.
call npm.cmd run dev
if errorlevel 1 pause
