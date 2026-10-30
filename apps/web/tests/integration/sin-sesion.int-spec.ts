import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { actAs, connect, createUser, errorCode, inTransaction } from './db';

// Login obligatorio (ADR-013): sin sesión (rol anon) la base no responde nada, ni la búsqueda,
// ni las familias, ni el contador de fotos, ni el registro de consultas.

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
  it('no busca, no ve las familias ni el contador y no registra consultas', async () => {
    await inTransaction(db, async (tx) => {
      await asAnon(tx);
      for (const sql of [
        `select * from buscar_articulos('pastilla onix')`,
        `select * from resumen_busqueda('pastilla onix')`,
        'select * from stats_fotos()',
        `select registrar_consulta('pastilla onix', null, null, 'texto', null, null, 2, false)`,
        'select * from v_familias',
        'select * from familias',
      ]) {
        expect(await errorCode(tx, sql), sql).toBe(PERMISSION_DENIED);
      }
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
});

describe('con sesión', () => {
  it('no trae más de 200 por página', async () => {
    await inTransaction(db, async (tx) => {
      await tx.query(
        `insert into articulos ("Codigo", "Nombre artículo")
         select 'MUCHOS-' || i, 'ARTICULO DE PRUEBA' from generate_series(1, 250) i`,
      );
      await actAs(tx, await createUser(tx, 'vendedor'));
      const { rowCount } = await tx.query(
        `select * from buscar_articulos('articulo prueba', null, null, 1000)`,
      );
      expect(rowCount).toBe(200);
    });
  });
});
