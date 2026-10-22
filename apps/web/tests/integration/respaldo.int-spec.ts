import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connect, DATABASE_URL, errorCode, inTransaction } from './db';

// lois_respaldo: el usuario con el que el respaldo nocturno lee la base (docs/respaldo.md).
// Lee todo, incluso las filas protegidas por RLS, y no puede escribir nada.

// Contraseña SOLO del Postgres local. En producción la carga el admin a mano.
const LOCAL_PASSWORD = 'lois_respaldo_local';

let admin: pg.Client;
let backup: pg.Client;

beforeAll(async () => {
  admin = await connect();
  await admin.query(`alter role lois_respaldo password '${LOCAL_PASSWORD}'`);
  const url = new URL(DATABASE_URL);
  url.username = 'lois_respaldo';
  url.password = LOCAL_PASSWORD;
  backup = await connect(url.toString());
});
afterAll(async () => {
  await Promise.all([admin?.end(), backup?.end()]);
});

async function count(client: pg.Client, table: string): Promise<number> {
  const { rows } = await client.query<{ n: number }>(`select count(*)::int as n from ${table}`);
  return rows[0]!.n;
}

describe('lois_respaldo', () => {
  it('lee todas las filas, también las de tablas con RLS', async () => {
    for (const table of [
      'public.articulos',
      'public.perfiles',
      'public.consultas_bot',
      'public.usuarios_telegram',
      'auth.users',
      'storage.objects',
    ]) {
      expect(await count(backup, table), table).toBe(await count(admin, table));
    }
    expect(await count(backup, 'public.articulos')).toBeGreaterThan(0);
    expect(await count(backup, 'auth.users')).toBeGreaterThan(0);
  });

  it('entra en solo lectura y no puede escribir aunque lo desactive', async () => {
    const { rows } = await backup.query<{ ro: string }>('select current_setting($1) as ro', [
      'default_transaction_read_only',
    ]);
    expect(rows[0]!.ro).toBe('on');
    await inTransaction(backup, async (tx) => {
      expect(await errorCode(tx, `update articulos set "Imagen" = 'x'`)).toBe('25006');
    });
    await inTransaction(backup, async (tx) => {
      await tx.query('set transaction read write');
      expect(await errorCode(tx, `update articulos set "Imagen" = 'x'`)).toBe('42501');
      expect(await errorCode(tx, 'delete from consultas_bot')).toBe('42501');
      expect(await errorCode(tx, 'truncate auth.users cascade')).toBe('42501');
      expect(await errorCode(tx, 'drop table articulos')).toBe('42501');
    });
  });

  it('no es superusuario ni puede crear roles o bases', async () => {
    const { rows } = await admin.query(
      `select rolsuper, rolcreaterole, rolcreatedb, rolbypassrls, rolcanlogin
       from pg_roles where rolname = 'lois_respaldo'`,
    );
    expect(rows[0]).toEqual({
      rolsuper: false,
      rolcreaterole: false,
      rolcreatedb: false,
      rolbypassrls: true,
      rolcanlogin: true,
    });
  });
});
