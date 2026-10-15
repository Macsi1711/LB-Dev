import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { actAs, connect, createUser, errorCode, inTransaction } from './db';

// Con RLS, Postgres no puede usar el índice trigram para el LIKE de la búsqueda (no es leakproof)
// y recorre toda la tabla: con 20.000 artículos, ~0,5–2 s por búsqueda. Las funciones que
// recorren la tabla corren como dueño y chequean el perfil a mano (migración 0018).

let db: pg.Client;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

const SCANNERS = ['filtrar_articulos', 'puntuar_parecidos'];

async function userWithoutProfile(tx: pg.Client): Promise<string> {
  const id = await createUser(tx);
  await tx.query('delete from perfiles where user_id = $1', [id]);
  return id;
}

describe('búsqueda con el índice', () => {
  it('las funciones que recorren articulos corren como dueño, sin RLS', async () => {
    const { rows } = await db.query<{ proname: string; prosecdef: boolean }>(
      `select proname, prosecdef from pg_proc
       where pronamespace = 'public'::regnamespace and proname = any($1)`,
      [SCANNERS],
    );
    expect(rows).toHaveLength(SCANNERS.length);
    for (const row of rows) expect(row.prosecdef, row.proname).toBe(true);
  });

  it('un vendedor encuentra lo mismo que antes', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx));
      const strict = await tx.query(`select codigo from buscar_articulos('pastilla onix')`);
      expect(strict.rows.length).toBeGreaterThan(0);
      const close = await tx.query(`select * from resumen_busqueda('pastila onyx')`);
      expect(close.rows[0]).toMatchObject({ aproximada: true });
    });
  });

  it('sin perfil no encuentra nada (igual que con RLS) y sin sesión ni puede llamarlas', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await userWithoutProfile(tx));
      for (const fn of SCANNERS) {
        const { rowCount } = await tx.query(`select * from ${fn}('pastilla onix')`);
        expect(rowCount, fn).toBe(0);
      }
      expect((await tx.query(`select * from buscar_articulos('pastilla onix')`)).rowCount).toBe(0);
      const summary = await tx.query(`select * from resumen_busqueda('pastilla onix')`);
      expect(summary.rows[0]).toMatchObject({ total: '0', aproximada: false });
    });
    await inTransaction(db, async (tx) => {
      await tx.query('set local role anon');
      for (const fn of SCANNERS) {
        expect(await errorCode(tx, `select * from ${fn}('pastilla onix')`), fn).toBe('42501');
      }
    });
  });
});
