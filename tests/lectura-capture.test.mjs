import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
import path from 'node:path';

// Ejecuta el módulo real con el SDK real y transporte simulado: sin consumir API.
const filename = path.resolve('src/lib/lectura-capture.ts');
const localRequire = createRequire(filename);
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const loaded = { exports: {} };
new Function('require', 'module', 'exports', compiled)(
  (name) => name === 'server-only' ? {} : localRequire(name), loaded, loaded.exports,
);
const { leerCapture, LecturaSchema } = loaded.exports;
const lectura = Object.fromEntries(Object.keys(LecturaSchema.shape).map((key) => [key, null]));
Object.assign(lectura, { es_comprobante: true, monto_bs: 131520, fecha: '2026-10-09', referencia: '123456', metodo: 'pago_movil' });
const archivo = { buffer: new Uint8Array([1, 2, 3]).buffer, contentType: 'image/png' };
const success = (overrides = {}) => ({
  id: 'resp_test', object: 'response', created_at: 0, status: 'completed',
  output: [{ type: 'message', id: 'msg_test', role: 'assistant', status: 'completed',
    content: [{ type: 'output_text', text: JSON.stringify(lectura), annotations: [] }] }],
  ...overrides,
});

test('Lectura de comprobantes mediante OpenAI', async (t) => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousModel = process.env.OPENAI_MODEL;
  const originalFetch = global.fetch;
  let request;
  let body = success();
  let status = 200;
  global.fetch = async (_url, options) => {
    request = JSON.parse(options.body);
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  };
  t.after(() => {
    global.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = previousModel;
  });
  process.env.OPENAI_API_KEY = 'test-key-not-real';
  delete process.env.OPENAI_MODEL;

  await t.test('imagen, nota, esquema y almacenamiento desactivado', async () => {
    assert.deepEqual(await leerCapture(archivo, '  octubre  '), { lectura });
    assert.equal(request.model, 'gpt-5.6-terra');
    assert.equal(request.store, false);
    assert.equal(request.text.format.strict, true);
    assert.deepEqual(request.input[0].content[0], {
      type: 'input_image', image_url: 'data:image/png;base64,AQID', detail: 'high',
    });
    assert.match(request.input[0].content[1].text, /octubre/);
  });
  await t.test('PDF y modelo configurable', async () => {
    process.env.OPENAI_MODEL = 'modelo-de-prueba';
    assert.deepEqual(await leerCapture({ ...archivo, contentType: 'application/pdf' }, ''), { lectura });
    assert.equal(request.model, 'modelo-de-prueba');
    assert.deepEqual(request.input[0].content[0], {
      type: 'input_file', filename: 'comprobante.pdf', file_data: 'data:application/pdf;base64,AQID',
    });
  });
  await t.test('archivo no compatible', async () => {
    assert.match((await leerCapture({ ...archivo, contentType: 'image/svg+xml' }, '')).error, /Formato no compatible/);
  });
  await t.test('rechazo del modelo', async () => {
    body = success({ output: [{ type: 'message', id: 'msg_test', role: 'assistant', status: 'completed', content: [{ type: 'refusal', refusal: 'rechazo de prueba' }] }] });
    assert.match((await leerCapture(archivo, '')).error, /manualmente/);
  });
  await t.test('respuesta incompleta no se acepta como lectura', async () => {
    body = success({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } });
    assert.match((await leerCapture(archivo, '')).error, /lectura válida/);
  });
  await t.test('datos inválidos no se aceptan', async () => {
    body = success();
    body.output[0].content[0].text = '{"es_comprobante":"incorrecto"}';
    assert.ok('error' in await leerCapture(archivo, ''));
  });
  for (const [code, expected] of [[401, /clave/], [429, /saldo o límite/], [404, /modelo/]]) {
    await t.test(`error ${code} sin exponer el mensaje del proveedor`, async () => {
      status = code;
      body = { error: { message: 'dato sensible de prueba', type: 'invalid_request_error' } };
      const result = await leerCapture(archivo, '');
      assert.match(result.error, expected);
      assert.doesNotMatch(result.error, /dato sensible/);
    });
  }
  await t.test('clave ausente sin llamada a la API', async () => {
    delete process.env.OPENAI_API_KEY;
    global.fetch = () => { throw new Error('No debe llamar a la API'); };
    assert.match((await leerCapture(archivo, '')).error, /OPENAI_API_KEY/);
  });
});
