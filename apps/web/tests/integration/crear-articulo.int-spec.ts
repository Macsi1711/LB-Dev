import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { actAs, connect, createUser, errorCode, inTransaction } from './db';

// Alta de productos desde la web: solo el admin, por crear_articulo().

let db: pg.Client;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

const CREATE = 'select * from crear_articulo($1, $2, $3, $4, $5)';

describe('crear_articulo', () => {
  it('el admin crea un producto con el nombre de la familia y queda marcado como cargado en la web', async () => {
    await inTransaction(db, async (tx) => {
      const admin = await createUser(tx, 'admin');
      await actAs(tx, admin);
      const { rows } = await tx.query(CREATE, [
        ' ph5949 ',
        ' filtro de aceite fiat cronos ',
        'FA',
        'Rosca 3/4',
        '  ',
      ]);
      expect(rows[0]).toMatchObject({
        codigo: 'PH5949',
        nombre: 'FILTRO DE ACEITE FIAT CRONOS',
        descripcion: 'Rosca 3/4',
        observaciones: null,
        familia_codigo: 'FA',
        familia_nombre: 'FILTROS DE ACEITE',
        tiene_foto: false,
      });
      await tx.query('reset role');
      const saved = await tx.query(
        'select "Codigo", creado_en_web is not null as en_web, creado_por from articulos where id = $1',
        [rows[0].id],
      );
      expect(saved.rows[0]).toEqual({ Codigo: 'PH5949', en_web: true, creado_por: admin });
    });
  });

  it('el producto nuevo se encuentra en el Mostrador', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx, 'admin'));
      await tx.query(CREATE, ['PH5949', 'FILTRO DE ACEITE FIAT CRONOS', 'FA', null, null]);
      await tx.query('reset role');
      await tx.query('set local role anon');
      const { rows } = await tx.query(
        `select codigo from buscar_articulos(p_q => 'ph5949', p_limit => 10, p_offset => 0)`,
      );
      expect(rows.map((r) => r.codigo)).toEqual(['PH5949']);
    });
  });

  it('no deja repetir un código, aunque cambien mayúsculas, espacios o guiones', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx, 'admin'));
      for (const code of ['854000', ' 854000 ', '120-33', '120 33', '12033', 'buj-10']) {
        expect(await errorCode(tx, CREATE, [code, 'OTRO', 'FA', null, null]), code).toBe('23505');
      }
    });
  });

  it('pide código y nombre, y una familia de producto que exista', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx, 'admin'));
      const cases: [string | null, string | null, string | null][] = [
        ['', 'NOMBRE', 'FA'],
        [null, 'NOMBRE', 'FA'],
        ['NUEVO-1', ' ', 'FA'],
        ['NUEVO-1', 'NOMBRE', 'NO-EXISTE'],
        ['NUEVO-1', 'NOMBRE', null],
        // 999 es una familia interna (descuentos), no de producto.
        ['NUEVO-1', 'NOMBRE', '999'],
        ['X'.repeat(41), 'NOMBRE', 'FA'],
      ];
      for (const [code, name, family] of cases) {
        expect(
          await errorCode(tx, CREATE, [code, name, family, null, null]),
          `${code}/${name}/${family}`,
        ).toBe('22023');
      }
    });
  });

  it('el vendedor y quien no entró no pueden crear productos', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx, 'vendedor'));
      expect(await errorCode(tx, CREATE, ['NUEVO-1', 'NOMBRE', 'FA', null, null])).toBe('42501');
    });
    await inTransaction(db, async (tx) => {
      await tx.query('set local role anon');
      expect(await errorCode(tx, CREATE, ['NUEVO-1', 'NOMBRE', 'FA', null, null])).toBe('42501');
    });
  });

  it('la web no inserta artículos directo: solo por la función', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx, 'admin'));
      expect(
        await errorCode(
          tx,
          `insert into articulos ("Codigo", "Nombre artículo") values ('NUEVO-1', 'NOMBRE')`,
        ),
      ).toBe('42501');
    });
  });
});
