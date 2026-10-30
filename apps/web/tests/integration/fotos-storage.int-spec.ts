import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { actAs, connect, createUser, errorCode, inTransaction } from './db';

// Fotos en Supabase Storage (ADR-008): bucket `fotos`, columna `articulos.foto` y asignar_foto_subida().

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

/** Simula que el archivo ya se subió al bucket (lo que hace la web antes de asignar). */
async function stored(tx: pg.Client, path: string): Promise<void> {
  await tx.query(`insert into storage.objects (bucket_id, name) values ('fotos', $1)`, [path]);
}

async function userWithoutProfile(tx: pg.Client): Promise<string> {
  const { rows } = await tx.query<{ id: string }>(
    `insert into auth.users (id, email, aud, role)
     values (gen_random_uuid(), gen_random_uuid() || '@sin-perfil.local', 'authenticated', 'authenticated')
     returning id`,
  );
  await tx.query('delete from perfiles where user_id = $1', [rows[0]!.id]);
  return rows[0]!.id;
}

const INSERT_OBJECT = `insert into storage.objects (bucket_id, name) values ($1, $2)`;

describe('bucket fotos', () => {
  it('es público, solo acepta JPEG y hasta 1 MB', async () => {
    const { rows } = await db.query(
      `select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'fotos'`,
    );
    expect(rows[0]).toEqual({
      public: true,
      file_size_limit: '1048576',
      allowed_mime_types: ['image/jpeg'],
    });
  });

  it('el admin sube la foto y la miniatura con la ruta del ADR', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx, 'admin'));
      expect(await errorCode(tx, INSERT_OBJECT, ['fotos', '15/AbCdEf12.jpg'])).toBeUndefined();
      expect(await errorCode(tx, INSERT_OBJECT, ['fotos', '15/AbCdEf12.mini.jpg'])).toBeUndefined();
    });
  });

  it('rechaza otras rutas, otros buckets, al vendedor y a quien no tiene perfil', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx, 'vendedor'));
      expect(await errorCode(tx, INSERT_OBJECT, ['fotos', '15/AbCdEf12.jpg'])).toBe('42501');
    });
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx, 'admin'));
      for (const path of ['854000.jpg', '15/../x.jpg', '15/AbCdEf12.png', 'x/AbCdEf12.jpg']) {
        expect(await errorCode(tx, INSERT_OBJECT, ['fotos', path]), path).toBe('42501');
      }
    });
    await inTransaction(db, async (tx) => {
      await actAs(tx, await userWithoutProfile(tx));
      expect(await errorCode(tx, INSERT_OBJECT, ['fotos', '15/AbCdEf12.jpg'])).toBe('42501');
    });
    await inTransaction(db, async (tx) => {
      await tx.query('set local role anon');
      expect(await errorCode(tx, INSERT_OBJECT, ['fotos', '15/AbCdEf12.jpg'])).toBe('42501');
    });
  });

  it('desde la web nadie borra ni pisa fotos', async () => {
    await inTransaction(db, async (tx) => {
      await stored(tx, '15/AbCdEf12.jpg');
      await actAs(tx, await createUser(tx, 'admin'));
      const where = `where bucket_id = 'fotos' and name = '15/AbCdEf12.jpg'`;
      // Sin política no afecta filas (o el trigger de Storage corta antes): da igual cuál.
      await errorCode(tx, `delete from storage.objects ${where}`);
      await errorCode(tx, `update storage.objects set name = '15/Pisada001.jpg' ${where}`);
      await tx.query('reset role');
      expect((await tx.query(`select 1 from storage.objects ${where}`)).rowCount).toBe(1);
    });
  });
});

describe('uso_fotos', () => {
  it('suma lo que ocupan todos los archivos y cuenta los artículos con foto', async () => {
    await inTransaction(db, async (tx) => {
      const user = await createUser(tx, 'admin');
      await actAs(tx, user);
      const before = await tx.query('select * from uso_fotos()');
      await tx.query('reset role');
      await tx.query(
        `insert into storage.objects (bucket_id, name, metadata)
         values ('fotos', '15/Uso00001.jpg', '{"size": 120000}'),
                ('fotos', '15/Uso00001.mini.jpg', '{"size": 20000}')`,
      );
      const id = await articleId(tx, '854100');
      await tx.query(`update articulos set foto = $1 where id = $2`, [`${id}/Uso00001.jpg`, id]);
      await actAs(tx, user);
      const { rows } = await tx.query('select * from uso_fotos()');
      expect(Number(rows[0].bytes) - Number(before.rows[0].bytes)).toBe(140000);
      expect(Number(rows[0].fotos) - Number(before.rows[0].fotos)).toBe(1);
    });
  });

  it('no lo ven el vendedor ni quien no tiene perfil', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx, 'vendedor'));
      expect(await errorCode(tx, 'select * from uso_fotos()')).toBe('42501');
    });
    await inTransaction(db, async (tx) => {
      await actAs(tx, await userWithoutProfile(tx));
      expect(await errorCode(tx, 'select * from uso_fotos()')).toBe('42501');
    });
    await inTransaction(db, async (tx) => {
      await tx.query('set local role anon');
      expect(await errorCode(tx, 'select * from uso_fotos()')).toBe('42501');
    });
  });
});

describe('asignar_foto_subida', () => {
  it('pone la ruta en el artículo sin tocar "Imagen" y guarda el historial', async () => {
    await inTransaction(db, async (tx) => {
      const id = await articleId(tx, '854000');
      const path = `${id}/AbCdEf12.jpg`;
      await stored(tx, path);
      const before = await tx.query('select "Imagen", foto from articulos where id = $1', [id]);
      const user = await createUser(tx, 'admin');
      await actAs(tx, user);
      const { rows } = await tx.query('select * from asignar_foto_subida($1, $2)', [id, path]);
      expect(rows[0]).toMatchObject({
        codigo: '854000',
        foto: path,
        imagen_url: before.rows[0].Imagen,
        tiene_foto: true,
      });
      const log = await tx.query('select * from fotos_subidas order by id desc limit 1');
      expect(log.rows[0]).toMatchObject({
        codigo: '854000',
        foto: path,
        foto_anterior: before.rows[0].foto,
        drive_id: null,
        user_id: user,
      });
    });
  });

  it('un artículo sin link de Drive pasa a tener foto y sale de la lista de sin foto', async () => {
    await inTransaction(db, async (tx) => {
      const id = await articleId(tx, '854100');
      await stored(tx, `${id}/AbCdEf12.jpg`);
      await actAs(tx, await createUser(tx, 'admin'));
      const before = await tx.query('select 1 from v_articulos_sin_foto where id = $1', [id]);
      expect(before.rowCount).toBe(1);
      await tx.query('select asignar_foto_subida($1, $2)', [id, `${id}/AbCdEf12.jpg`]);
      const after = await tx.query('select 1 from v_articulos_sin_foto where id = $1', [id]);
      expect(after.rowCount).toBe(0);
    });
  });

  it('al reemplazar, el historial guarda la foto anterior', async () => {
    await inTransaction(db, async (tx) => {
      const id = await articleId(tx, '854000');
      await stored(tx, `${id}/Primera01.jpg`);
      await stored(tx, `${id}/Segunda02.jpg`);
      await actAs(tx, await createUser(tx, 'admin'));
      await tx.query('select asignar_foto_subida($1, $2)', [id, `${id}/Primera01.jpg`]);
      await tx.query('select asignar_foto_subida($1, $2)', [id, `${id}/Segunda02.jpg`]);
      const log = await tx.query('select foto, foto_anterior from fotos_subidas order by id desc');
      expect(log.rows[0]).toEqual({
        foto: `${id}/Segunda02.jpg`,
        foto_anterior: `${id}/Primera01.jpg`,
      });
    });
  });

  it('rechaza rutas de otro artículo, miniaturas, otras formas o que no están en el bucket', async () => {
    await inTransaction(db, async (tx) => {
      const id = await articleId(tx, '854000');
      const other = await articleId(tx, '854001');
      await stored(tx, `${other}/AbCdEf12.jpg`);
      await stored(tx, `${id}/AbCdEf12.mini.jpg`);
      await actAs(tx, await createUser(tx, 'admin'));
      const assign = 'select asignar_foto_subida($1, $2)';
      expect(await errorCode(tx, assign, [id, `${other}/AbCdEf12.jpg`])).toBe('22023');
      expect(await errorCode(tx, assign, [id, `${id}/AbCdEf12.mini.jpg`])).toBe('22023');
      expect(await errorCode(tx, assign, [id, 'https://evil/x.jpg'])).toBe('22023');
      expect(await errorCode(tx, assign, [id, `${id}/NoSubida1.jpg`])).toBe('22023');
    });
  });

  it('el vendedor no asigna fotos (ADR-013)', async () => {
    await inTransaction(db, async (tx) => {
      const id = await articleId(tx, '854000');
      await stored(tx, `${id}/AbCdEf12.jpg`);
      await actAs(tx, await createUser(tx, 'vendedor'));
      expect(
        await errorCode(tx, 'select asignar_foto_subida($1, $2)', [id, `${id}/AbCdEf12.jpg`]),
      ).toBe('42501');
    });
  });

  it('avisa si el artículo no existe y no deja a quien no tiene perfil', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx, 'admin'));
      const missing = 999999999;
      expect(
        await errorCode(tx, 'select asignar_foto_subida($1, $2)', [
          missing,
          `${missing}/AbCdEf12.jpg`,
        ]),
      ).toBe('P0002');
    });
    await inTransaction(db, async (tx) => {
      const id = await articleId(tx, '854000');
      await stored(tx, `${id}/AbCdEf12.jpg`);
      await actAs(tx, await userWithoutProfile(tx));
      expect(
        await errorCode(tx, 'select asignar_foto_subida($1, $2)', [id, `${id}/AbCdEf12.jpg`]),
      ).toBe('42501');
    });
  });

  it('la web no escribe la columna foto ni el historial directo', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx, 'admin'));
      expect(await errorCode(tx, `update articulos set foto = '1/AbCdEf12.jpg'`)).toBe('42501');
      expect(
        await errorCode(
          tx,
          `insert into fotos_subidas (articulo_id, foto) values (1, '1/AbCdEf12.jpg')`,
        ),
      ).toBe('42501');
    });
  });
});
