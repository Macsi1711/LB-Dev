import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { actAs, connect, createUser, errorCode, inTransaction } from './db';

// Editar y eliminar productos desde la web: solo el admin, por editar_articulo() y
// eliminar_articulo(). Al eliminar queda una copia en articulos_eliminados.

let db: pg.Client;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

async function articleId(tx: pg.Client, code: string): Promise<string> {
  const { rows } = await tx.query<{ id: string }>(
    'select id from articulos where upper(trim("Codigo")) = $1',
    [code],
  );
  return rows[0]!.id;
}

const EDIT = 'select * from editar_articulo($1, $2, $3, $4, $5)';
const REMOVE = 'select eliminar_articulo($1)';

describe('editar_articulo', () => {
  it('el admin corrige nombre, familia, descripción y observaciones; el código no cambia', async () => {
    await inTransaction(db, async (tx) => {
      const id = await articleId(tx, 'AMO-500');
      const admin = await createUser(tx, 'admin');
      await actAs(tx, admin);
      const { rows } = await tx.query(EDIT, [
        id,
        ' amortiguador tras. chevrolet corsa ',
        'FA',
        'Gas, par',
        '  ',
      ]);
      expect(rows[0]).toMatchObject({
        codigo: 'AMO-500',
        nombre: 'AMORTIGUADOR TRAS. CHEVROLET CORSA',
        descripcion: 'Gas, par',
        observaciones: null,
        familia_codigo: 'FA',
        familia_nombre: 'FILTROS DE ACEITE',
      });
      await tx.query('reset role');
      const saved = await tx.query(
        'select editado_en_web is not null as editado, editado_por from articulos where id = $1',
        [id],
      );
      expect(saved.rows[0]).toEqual({ editado: true, editado_por: admin });
    });
  });

  it('pide nombre y una familia de producto que exista, y avisa si el artículo no existe', async () => {
    await inTransaction(db, async (tx) => {
      const id = await articleId(tx, 'AMO-500');
      await actAs(tx, await createUser(tx, 'admin'));
      expect(await errorCode(tx, EDIT, [id, ' ', 'AM', null, null])).toBe('22023');
      expect(await errorCode(tx, EDIT, [id, 'NOMBRE', 'NO-EXISTE', null, null])).toBe('22023');
      expect(await errorCode(tx, EDIT, [id, 'NOMBRE', '999', null, null])).toBe('22023');
      expect(await errorCode(tx, EDIT, [999999999, 'NOMBRE', 'AM', null, null])).toBe('P0002');
    });
  });

  it('el vendedor y quien no entró no pueden editar', async () => {
    await inTransaction(db, async (tx) => {
      const id = await articleId(tx, 'AMO-500');
      await actAs(tx, await createUser(tx, 'vendedor'));
      expect(await errorCode(tx, EDIT, [id, 'NOMBRE', 'AM', null, null])).toBe('42501');
    });
    await inTransaction(db, async (tx) => {
      const id = await articleId(tx, 'AMO-500');
      await tx.query('set local role anon');
      expect(await errorCode(tx, EDIT, [id, 'NOMBRE', 'AM', null, null])).toBe('42501');
    });
  });
});

describe('eliminar_articulo', () => {
  it('el admin lo saca del catálogo y queda una copia completa para recuperarlo', async () => {
    await inTransaction(db, async (tx) => {
      const id = await articleId(tx, 'BUJ-10');
      const admin = await createUser(tx, 'admin');
      await actAs(tx, admin);
      await tx.query(REMOVE, [id]);
      await tx.query('reset role');
      expect((await tx.query('select 1 from articulos where id = $1', [id])).rowCount).toBe(0);
      const copy = await tx.query(
        `select codigo, datos->>'Nombre artículo' as nombre, datos->>'codigo  familia' as familia,
                eliminado_por
         from articulos_eliminados where articulo_id = $1`,
        [id],
      );
      expect(copy.rows[0]).toEqual({
        codigo: 'BUJ-10',
        nombre: 'BUJÍA IRIDIUM NGK',
        familia: 'BU',
        eliminado_por: admin,
      });
    });
  });

  it('el artículo eliminado ya no aparece en el Mostrador', async () => {
    await inTransaction(db, async (tx) => {
      const id = await articleId(tx, 'BUJ-10');
      await actAs(tx, await createUser(tx, 'admin'));
      await tx.query(REMOVE, [id]);
      await tx.query('reset role');
      await tx.query('set local role anon');
      const { rows } = await tx.query(
        `select codigo from buscar_articulos(p_q => 'BUJ-10', p_limit => 10, p_offset => 0)`,
      );
      expect(rows.map((r) => r.codigo)).not.toContain('BUJ-10');
    });
  });

  it('avisa si no existe, y no deja al vendedor ni a quien no entró', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx, 'admin'));
      expect(await errorCode(tx, REMOVE, [999999999])).toBe('P0002');
    });
    await inTransaction(db, async (tx) => {
      const id = await articleId(tx, 'BUJ-10');
      await actAs(tx, await createUser(tx, 'vendedor'));
      expect(await errorCode(tx, REMOVE, [id])).toBe('42501');
    });
    await inTransaction(db, async (tx) => {
      const id = await articleId(tx, 'BUJ-10');
      await tx.query('set local role anon');
      expect(await errorCode(tx, REMOVE, [id])).toBe('42501');
    });
  });

  it('la web no lee ni escribe las copias de los eliminados, ni borra artículos directo', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx, 'admin'));
      expect(await errorCode(tx, 'select * from articulos_eliminados')).toBe('42501');
      expect(await errorCode(tx, `delete from articulos where "Codigo" = 'BUJ-10'`)).toBe('42501');
    });
  });
});
