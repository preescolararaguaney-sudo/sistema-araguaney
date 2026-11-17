// Prueba real y manual. No escribe en Supabase ni envía mensajes a Telegram.
// Ejecutar: node tests/probar-openai.mjs (consume una lectura de la API).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import sharp from 'sharp';
import nextEnv from '@next/env';

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.OPENAI_API_KEY?.trim()) {
  console.error('Falta OPENAI_API_KEY en .env.local.');
  process.exit(1);
}

const filename = path.resolve('src/lib/lectura-capture.ts');
const localRequire = createRequire(filename);
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const loaded = { exports: {} };
new Function('require', 'module', 'exports', compiled)(
  (name) => name === 'server-only' ? {} : localRequire(name), loaded, loaded.exports,
);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="700">
<rect width="1100" height="700" fill="white"/>
<g font-family="Arial" font-size="32" fill="black">
<text x="50" y="65">COMPROBANTE FICTICIO - PRUEBA DE SOFTWARE</text>
<text x="50" y="145">Transferencia en bolivares</text>
<text x="50" y="210">Banco: Banco de Prueba</text>
<text x="50" y="275">Monto: Bs 1.234,56</text>
<text x="50" y="340">Fecha: 17/11/2026</text>
<text x="50" y="405">Referencia: 987654321</text>
<text x="50" y="470">Emisor: Persona de Prueba</text>
<text x="50" y="535">Receptor: U E P Colegio Araguaney</text>
<text x="50" y="600">Concepto: mensualidad noviembre alumno ficticio</text>
</g></svg>`;
const png = await sharp(Buffer.from(svg)).png().toBuffer();
console.log('Probando lectura con el modelo:', process.env.OPENAI_MODEL?.trim() || 'gpt-5.6-terra');
const result = await loaded.exports.leerCapture({
  buffer: png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength),
  contentType: 'image/png',
}, 'Alumno ficticio, mensualidad noviembre. Prueba de software.');
if ('error' in result) {
  console.error(result.error);
  process.exitCode = 1;
} else {
  const lectura = result.lectura;
  console.log(JSON.stringify({
    es_comprobante: lectura.es_comprobante,
    monto_bs: lectura.monto_bs,
    fecha: lectura.fecha,
    referencia: lectura.referencia,
    metodo: lectura.metodo,
  }, null, 2));
  if (lectura.es_comprobante && lectura.monto_bs === 1234.56 && lectura.fecha === '2026-11-17' && lectura.referencia === '987654321' && lectura.metodo === 'transferencia_bs') {
    console.log('PRUEBA CORRECTA: importe, fecha, referencia y metodo coinciden. No se creo ningun pago.');
  } else {
    console.error('La API respondio, pero la extraccion no coincide con el comprobante ficticio.');
    process.exitCode = 1;
  }
}
