#!/usr/bin/env node
// Pasa las fotos de Drive a Supabase Storage, una sola vez (ADR-008, paso 2).
//
// Corre con la sesión de un usuario de la web: el mail y la contraseña se escriben en la terminal
// (nunca en el chat ni en un archivo). Las fotos pasan por memoria; no se guarda nada en disco.
// Baja cada foto por su link público de Drive ya achicada por Google (800 px y miniatura de 320,
// en JPEG), muestra un resumen y, si se confirma, la sube al bucket `fotos` y la asigna con
// asignar_foto_subida(). "Imagen" no se toca. Si se corta, se vuelve a correr: saltea los
// artículos que ya tienen foto en Storage.
//
//   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_KEY=<clave publishable> \
//     node apps/web/scripts/migrar-fotos-drive.mjs [--probar]
//
// --probar: solo baja y resume, no sube nada.
// FOTOS_ORIGEN (solo para probar en local): plantilla con {id} y {lado} en lugar de Google.
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';

const BIG = 800;
const MINI = 320;
const MAX_BYTES = 1024 * 1024; // límite del bucket
const DOWNLOADS_AT_ONCE = 6;
// De a una: el plan gratis de Supabase tiene pocas conexiones y de a 4 se agotaban.
const UPLOADS_AT_ONCE = 1;
const RETRIES = 5;
const TOKEN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

const out = (line = '') => process.stdout.write(`${line}\n`);
const dryRun = process.argv.includes('--probar');

function sources(driveId, side) {
  const template = process.env.FOTOS_ORIGEN;
  if (template) return [template.replace('{id}', driveId).replace('{lado}', String(side))];
  return [
    `https://lh3.googleusercontent.com/d/${driveId}=s${side}-rj`,
    `https://drive.google.com/thumbnail?id=${driveId}&sz=s${side}`,
  ];
}

const isJpeg = (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

async function download(driveId, side) {
  let reason = 'sin respuesta';
  for (const url of sources(driveId, side)) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) {
        reason = `HTTP ${response.status}`;
        continue;
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!isJpeg(bytes)) reason = 'no es JPEG (¿no está compartida?)';
      else if (bytes.length > MAX_BYTES) reason = 'pesa más de 1 MB';
      else return { bytes };
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error);
    }
  }
  return { reason };
}

function token() {
  return Array.from(randomBytes(12), (b) => TOKEN_CHARS[b % TOKEN_CHARS.length]).join('');
}

/** Corre `work` sobre cada ítem, de a `size` por vez, y devuelve los resultados en orden. */
async function inBatches(items, size, work, progress) {
  const results = new Array(items.length);
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await work(items[i]);
      progress(++done, items.length);
    }
  }
  await Promise.all(Array.from({ length: size }, worker));
  return results;
}

const showProgress = (label) => (done, total) => {
  process.stdout.write(`\r${label}: ${done}/${total}`);
  if (done === total) process.stdout.write('\n');
};

async function askHidden(question) {
  if (process.env.FOTOS_PASSWORD) return process.env.FOTOS_PASSWORD; // solo tests locales
  process.stdout.write(question);
  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  return new Promise((resolve) => {
    let value = '';
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (char === '\u0003') process.exit(130);
        value = char === '\u007f' || char === '\b' ? value.slice(0, -1) : value + char;
      }
    };
    stdin.on('data', onData);
  });
}

async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

async function pendingArticles(supabase) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('v_articulos')
      .select('id, codigo, imagen_drive_id')
      .not('imagen_drive_id', 'is', null)
      .is('foto', null)
      .order('id')
      .range(from, from + 999);
    if (error) throw new Error(`No se pudo leer los artículos: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Reintenta cuando la base está ocupada (sin conexiones libres o error 500), esperando cada vez más. */
async function withRetry(call) {
  for (let attempt = 1; ; attempt++) {
    const result = await call();
    // Si un intento anterior sí llegó a guardar el archivo, el reintento choca: ya está subido.
    if (attempt > 1 && /already exists|duplicate/i.test(result.error?.message ?? '')) {
      return { error: null };
    }
    const busy = /too many connections|internal server error/i.test(result.error?.message ?? '');
    if (!busy || attempt === RETRIES) return result;
    await sleep(2000 * 2 ** (attempt - 1));
  }
}

async function upload(supabase, item) {
  const path = `${item.id}/${token()}`;
  const options = { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false };
  for (const [suffix, bytes] of [
    ['.jpg', item.big],
    ['.mini.jpg', item.mini],
  ]) {
    const { error } = await withRetry(() =>
      supabase.storage.from('fotos').upload(path + suffix, bytes, options),
    );
    if (error) return `no se pudo subir: ${error.message}`;
  }
  const { error } = await withRetry(() =>
    supabase.rpc('asignar_foto_subida', { p_articulo_id: item.id, p_ruta: `${path}.jpg` }),
  );
  return error ? `no se pudo asignar: ${error.message}` : null;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error('Faltan SUPABASE_URL y SUPABASE_KEY (la clave publishable).');

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  out(`Supabase: ${new URL(url).host}${dryRun ? '  (prueba: no se sube nada)' : ''}`);
  const email = process.env.FOTOS_EMAIL ?? (await ask('Mail de tu usuario de la web: '));
  const password = await askHidden('Contraseña (no se ve al escribir): ');
  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError) throw new Error(`No se pudo entrar: ${loginError.message}`);

  const pending = await pendingArticles(supabase);
  out(`Artículos con foto en Drive y todavía sin foto en Storage: ${pending.length}`);
  if (pending.length === 0) return;

  const downloaded = await inBatches(
    pending,
    DOWNLOADS_AT_ONCE,
    async (article) => {
      const big = await download(article.imagen_drive_id, BIG);
      const mini = big.bytes ? await download(article.imagen_drive_id, MINI) : big;
      return { ...article, big: big.bytes, mini: mini.bytes, reason: big.reason ?? mini.reason };
    },
    showProgress('Bajando de Drive'),
  );

  const ready = downloaded.filter((item) => item.big && item.mini);
  const failed = downloaded.filter((item) => !(item.big && item.mini));
  const bytes = ready.reduce((sum, item) => sum + item.big.length + item.mini.length, 0);
  out();
  out(`Listas para subir: ${ready.length} (${(bytes / 1024 / 1024).toFixed(1)} MB en total)`);
  out(`No se pudieron bajar: ${failed.length}`);
  for (const item of failed)
    out(`  ${item.codigo}  (Drive ${item.imagen_drive_id}): ${item.reason}`);

  if (dryRun || ready.length === 0) return;
  const answer = process.env.FOTOS_CONFIRMAR ?? (await ask(`¿Subir ${ready.length} fotos? (s/n) `));
  if (answer.toLowerCase() !== 's') {
    out('No se subió nada.');
    return;
  }

  const errors = await inBatches(
    ready,
    UPLOADS_AT_ONCE,
    (item) => upload(supabase, item),
    showProgress('Subiendo a Storage'),
  );
  const uploadFailed = ready.filter((_, i) => errors[i]);
  out(`Subidas y asignadas: ${ready.length - uploadFailed.length}`);
  out(`Fallaron al subir: ${uploadFailed.length}`);
  uploadFailed.forEach((item) => out(`  ${item.codigo}: ${errors[ready.indexOf(item)]}`));
  if (failed.length + uploadFailed.length > 0) {
    out('Podés volver a correrlo: solo intenta con los que faltan.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
