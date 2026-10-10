import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { actAs, errorCode, connect, createUser, inTransaction } from './db';

let db: pg.Client;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

const PERMISSION_DENIED = '42501';

describe('anon (sin sesión)', () => {
  it('no puede leer artículos ni buscar', async () => {
    await inTransaction(db, async (tx) => {
      await tx.query('set local role anon');
      expect(await errorCode(tx, 'select * from v_articulos')).toBe(PERMISSION_DENIED);
      expect(await errorCode(tx, `select * from buscar_articulos('onix')`)).toBe(PERMISSION_DENIED);
    });
  });
});

describe('perfiles', () => {
  it('se crean como vendedor cuando el admin invita a alguien', async () => {
    await inTransaction(db, async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        `insert into auth.users (id, email, aud, role)
         values (gen_random_uuid(), 'nuevo@test.local', 'authenticated', 'authenticated')
         returning id`,
      );
      const profile = await tx.query('select nombre, rol from perfiles where user_id = $1', [
        rows[0]!.id,
      ]);
      expect(profile.rows[0]).toEqual({ nombre: 'nuevo', rol: 'vendedor' });
    });
  });

  it('mi_perfil() recrea el perfil si falta, como vendedor', async () => {
    await inTransaction(db, async (tx) => {
      const id = await createUser(tx, 'admin');
      await tx.query('delete from perfiles where user_id = $1', [id]);
      await actAs(tx, id);
      const { rows } = await tx.query('select rol from mi_perfil()');
      expect(rows[0]).toEqual({ rol: 'vendedor' });
    });
  });

  it('un vendedor solo ve su propio perfil', async () => {
    await inTransaction(db, async (tx) => {
      await createUser(tx, 'vendedor');
      const me = await createUser(tx, 'vendedor');
      await actAs(tx, me);
      const { rows } = await tx.query('select user_id from perfiles');
      expect(rows).toEqual([{ user_id: me }]);
    });
  });
});

describe('vendedor', () => {
  it('lee el catálogo y busca', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx, 'vendedor'));
      const { rows } = await tx.query(`select codigo from buscar_articulos('pastilla onix')`);
      expect(rows).toHaveLength(2);
      const families = await tx.query('select count(*)::int as n from familias');
      expect(families.rows[0].n).toBeGreaterThan(0);
    });
  });

  it('no puede cambiar fotos ni otras columnas', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx, 'vendedor'));
      const r = await tx.query(`update articulos set "Imagen" = 'x' where "Codigo" = '854001'`);
      expect(r.rowCount).toBe(0);
      expect(
        await errorCode(
          tx,
          `update articulos set "Nombre artículo" = 'x' where "Codigo" = '854001'`,
        ),
      ).toBe(PERMISSION_DENIED);
      expect(await errorCode(tx, 'delete from articulos')).toBe(PERMISSION_DENIED);
    });
  });

  it('no ve nada del bot ni de las fotos sin match', async () => {
    await inTransaction(db, async (tx) => {
      await tx.query(
        `insert into consultas_bot (chat_id, fuente, texto, cantidad) values (1, 'texto', 'x', 0)`,
      );
      await tx.query(`insert into usuarios_telegram (chat_id, nombre) values (1, 'Juan')`);
      await tx.query(`insert into fotos_sin_match (drive_id, archivo) values ('d1', 'a.jpg')`);
      await actAs(tx, await createUser(tx, 'vendedor'));
      for (const table of ['consultas_bot', 'usuarios_telegram', 'fotos_sin_match']) {
        const { rows } = await tx.query(`select * from ${table}`);
        expect(rows, table).toEqual([]);
      }
      expect(
        await errorCode(tx, `insert into usuarios_telegram (chat_id, nombre) values (2, 'Ana')`),
      ).toBe(PERMISSION_DENIED);
    });
  });
});

describe('usuario sin perfil', () => {
  it('no ve artículos', async () => {
    await inTransaction(db, async (tx) => {
      const id = await createUser(tx);
      await tx.query('delete from perfiles where user_id = $1', [id]);
      await actAs(tx, id);
      const { rows } = await tx.query('select count(*)::int as n from v_articulos');
      expect(rows[0].n).toBe(0);
    });
  });
});

describe('admin', () => {
  it('asigna una foto a mano, pero no toca otras columnas', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx, 'admin'));
      const r = await tx.query(
        `update articulos set "Imagen" = 'https://drive.google.com/file/d/Z/view?usp=drivesdk'
         where "Codigo" = '854001'`,
      );
      expect(r.rowCount).toBe(1);
      expect(
        await errorCode(
          tx,
          `update articulos set "Nombre artículo" = 'x' where "Codigo" = '854001'`,
        ),
      ).toBe(PERMISSION_DENIED);
    });
  });

  it('administra la lista blanca del bot y lee las consultas', async () => {
    await inTransaction(db, async (tx) => {
      await tx.query('delete from consultas_bot');
      await tx.query(
        `insert into consultas_bot (chat_id, fuente, texto, cantidad) values (1, 'texto', 'x', 0)`,
      );
      await actAs(tx, await createUser(tx, 'admin'));
      await tx.query(`insert into usuarios_telegram (chat_id, nombre) values (99, 'Ana')`);
      await tx.query(`update usuarios_telegram set activo = false where chat_id = 99`);
      const queries = await tx.query('select texto from consultas_bot');
      expect(queries.rows).toEqual([{ texto: 'x' }]);
      const deleted = await tx.query('delete from usuarios_telegram where chat_id = 99');
      expect(deleted.rowCount).toBe(1);
    });
  });

  it('marca fotos sin match como resueltas, pero no edita otros campos', async () => {
    await inTransaction(db, async (tx) => {
      await tx.query(`insert into fotos_sin_match (drive_id, archivo) values ('d1', 'a.jpg')`);
      await actAs(tx, await createUser(tx, 'admin'));
      const r = await tx.query(`update fotos_sin_match set resuelto = true where drive_id = 'd1'`);
      expect(r.rowCount).toBe(1);
      expect(
        await errorCode(tx, `update fotos_sin_match set archivo = 'b.jpg' where drive_id = 'd1'`),
      ).toBe(PERMISSION_DENIED);
    });
  });
});
