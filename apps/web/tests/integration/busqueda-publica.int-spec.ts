import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { actAs, connect, createUser, errorCode, inTransaction } from './db';

// Búsqueda sin sesión (ADR-010): en el Mostrador cualquiera busca por texto; el login queda para
// el admin. Sin sesión (rol anon) se busca solo por las funciones, que cortan en 200 por página:
// las tablas no se leen directo.

let db: pg.Client;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

const PERMISSION_DENIED = '42501';

async function asAnon(tx: pg.Client): Promise<void> {
  await tx.query('set local role anon');
}

describe('sin sesión', () => {
  it('busca y ve cuántos hay, también cuando la respuesta es lo más parecido', async () => {
    await inTransaction(db, async (tx) => {
      await asAnon(tx);
      const exact = await tx.query(`select codigo from buscar_articulos('pastilla onix')`);
      expect(exact.rows.map((r) => r.codigo).sort()).toEqual(['854000', '854001']);
      const close = await tx.query(`select codigo from buscar_articulos('pastiya onix')`);
      expect(close.rows.length).toBeGreaterThan(0);
      const summary = await tx.query(`select * from resumen_busqueda('pastiya onix')`);
      expect(summary.rows[0]).toMatchObject({ aproximada: true });
    });
  });

  it('ve las familias para el filtro', async () => {
    await inTransaction(db, async (tx) => {
      await asAnon(tx);
      const { rows } = await tx.query('select codigo, nombre from v_familias');
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  it('ve cuántos artículos tienen foto, los mismos números que el admin (ADR-011)', async () => {
    await inTransaction(db, async (tx) => {
      await tx.query(`update articulos set foto = '1/abcdefgh.jpg' where "Codigo" = '854000'`);
      await actAs(tx, await createUser(tx, 'admin'));
      const admin = await tx.query('select * from stats_fotos()');
      await tx.query('reset role');
      await asAnon(tx);
      const anon = await tx.query('select * from stats_fotos()');
      expect(anon.rows).toEqual(admin.rows);
      expect(Number(anon.rows[0].con_foto)).toBeGreaterThan(0);
    });
  });

  it('no lee las tablas ni llama a las funciones internas de la búsqueda', async () => {
    await inTransaction(db, async (tx) => {
      await asAnon(tx);
      for (const sql of [
        'select * from v_articulos',
        'select * from articulos',
        `select * from filtrar_articulos('')`,
        `select * from puntuar_parecidos('onix')`,
        `select contar_articulos('onix')`,
        'select * from consultas_bot',
        'select * from v_consultas_bot',
        'select * from usuarios_telegram',
        'select * from perfiles',
      ]) {
        expect(await errorCode(tx, sql), sql).toBe(PERMISSION_DENIED);
      }
    });
  });

  it('no asigna fotos ni sube archivos', async () => {
    await inTransaction(db, async (tx) => {
      await asAnon(tx);
      expect(await errorCode(tx, `select asignar_foto_subida(1, '1/AbCdEf12.jpg')`)).toBe(
        PERMISSION_DENIED,
      );
      expect(
        await errorCode(
          tx,
          `insert into storage.objects (bucket_id, name) values ('fotos', '1/AbCdEf12.jpg')`,
        ),
      ).toBe(PERMISSION_DENIED);
    });
  });

  it('no trae más de 200 por página', async () => {
    await inTransaction(db, async (tx) => {
      await tx.query(
        `insert into articulos ("Codigo", "Nombre artículo")
         select 'MUCHOS-' || i, 'ARTICULO DE PRUEBA' from generate_series(1, 250) i`,
      );
      await asAnon(tx);
      const { rowCount } = await tx.query(
        `select * from buscar_articulos('articulo prueba', null, null, 1000)`,
      );
      expect(rowCount).toBe(200);
    });
  });
});
