// La caja del respaldo (ADR-012): un store privado de Vercel Blob en producción y una carpeta en
// el ensayo local (CAJA_CARPETA), porque Vercel Blob no se levanta en local. Lo usan los scripts
// de esta carpeta a través de la función `caja` de comun.sh; corre dentro del contenedor.
// Uso: node caja.mjs listar <prefijo> | subir <archivo> <ruta> | subir-carpeta <carpeta> <prefijo>
//                    | bajar <ruta> (a la salida estándar) | borrar <ruta>
import { createReadStream } from 'node:fs';
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { del, get, list, put } from '@vercel/blob';

const ACCESS = 'private';
// Subidas a la vez al subir una carpeta (las fotos de la primera noche).
const AT_ONCE = 4;

async function filesUnder(folder) {
  const entries = await readdir(folder, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => relative(folder, join(e.parentPath, e.name)).split('\\').join('/'));
}

const blobBox = {
  async list(prefix) {
    const paths = [];
    let cursor;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      paths.push(...page.blobs.map((b) => b.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return paths;
  },
  async upload(file, path) {
    const { size } = await stat(file);
    await put(path, createReadStream(file), {
      access: ACCESS,
      allowOverwrite: true,
      multipart: size > 50 * 1024 * 1024,
    });
  },
  async download(path) {
    // Sin caché: lo que se acaba de subir tiene que estar.
    const found = await get(path, { access: ACCESS, useCache: false });
    if (!found?.stream) throw new Error(`No está en la caja: ${path}`);
    await pipeline(Readable.fromWeb(found.stream), process.stdout);
  },
  async remove(path) {
    await del(path);
  },
};

const folderBox = (root) => ({
  async list(prefix) {
    const all = await filesUnder(root).catch(() => []);
    return all.filter((p) => p.startsWith(prefix));
  },
  async upload(file, path) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await cp(file, join(root, path));
  },
  async download(path) {
    await pipeline(createReadStream(join(root, path)), process.stdout);
  },
  async remove(path) {
    await rm(join(root, path), { force: true });
  },
});

const box = process.env.CAJA_CARPETA ? folderBox(process.env.CAJA_CARPETA) : blobBox;
const [command, ...args] = process.argv.slice(2);

switch (command) {
  case 'listar': {
    const paths = await box.list(args[0] ?? '');
    // Mismo orden que `sort` con LC_ALL=C, que es como comparan los scripts.
    paths.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    if (paths.length) process.stdout.write(`${paths.join('\n')}\n`);
    break;
  }
  case 'subir':
    await box.upload(args[0], args[1]);
    break;
  case 'subir-carpeta': {
    const [folder, prefix] = args;
    const pending = await filesUnder(folder);
    const worker = async () => {
      for (let p = pending.pop(); p; p = pending.pop()) {
        await box.upload(join(folder, p), prefix + p);
      }
    };
    await Promise.all(Array.from({ length: AT_ONCE }, worker));
    break;
  }
  case 'bajar':
    await box.download(args[0]);
    break;
  case 'borrar':
    await box.remove(args[0]);
    break;
  default:
    console.error(`Comando desconocido: ${command ?? '(ninguno)'}`);
    process.exit(2);
}
