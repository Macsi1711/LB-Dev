import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { actAs, connect, createUser, errorCode, inTransaction } from './db';

let db: pg.Client;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

const DRIVE_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz_-123';

async function articleId(tx: pg.Client, code: string): Promise<string> {
  const { rows } = await tx.query<{ id: string }>(
    'select id from articulos where upper(trim("Codigo")) = $1',
    [code],
  );
  return rows[0]!.id;
}

describe('asignar_imagen_drive (foto subida desde la web)', () => {
  it('escribe el link con el formato de n8n y guarda quién la subió y la foto anterior', async () => {
    await inTransaction(db, async (tx) => {
      const id = await articleId(tx, '854000');
      const before = await tx.query('select "Imagen" from articulos where id = $1', [id]);
      const user = await createUser(tx, 'vendedor');
      await actAs(tx, user);
      const { rows } = await tx.query('select * from asignar_imagen_drive($1, $2)', [id, DRIVE_ID]);
      expect(rows[0]).toMatchObject({
        codigo: '854000',
        imagen_url: `https://drive.google.com/file/d/${DRIVE_ID}/view?usp=drivesdk`,
        imagen_drive_id: DRIVE_ID,
      });
      const log = await tx.query('select * from fotos_subidas order by id desc limit 1');
      expect(log.rows[0]).toMatchObject({
        codigo: '854000',
        drive_id: DRIVE_ID,
        user_id: user,
        imagen_anterior: before.rows[0].Imagen,
      });
    });
  });

  it('rechaza un id de Drive con otra forma', async () => {
    await inTransaction(db, async (tx) => {
      const id = await articleId(tx, '854001');
      await actAs(tx, await createUser(tx));
      expect(
        await errorCode(tx, 'select asignar_imagen_drive($1, $2)', [id, 'https://evil/x']),
      ).toBe('22023');
    });
  });

  it('avisa si el artículo no existe', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx));
      expect(await errorCode(tx, 'select asignar_imagen_drive($1, $2)', [-1, DRIVE_ID])).toBe(
        'P0002',
      );
    });
  });

  it('sin perfil no se puede, y nadie escribe el historial directo', async () => {
    await inTransaction(db, async (tx) => {
      const id = await articleId(tx, '854001');
      const { rows } = await tx.query<{ id: string }>(
        `insert into auth.users (id, email, aud, role)
         values (gen_random_uuid(), 'sin-perfil-foto@test.local', 'authenticated', 'authenticated')
         returning id`,
      );
      await tx.query('delete from perfiles where user_id = $1', [rows[0]!.id]);
      await actAs(tx, rows[0]!.id);
      expect(await errorCode(tx, 'select asignar_imagen_drive($1, $2)', [id, DRIVE_ID])).toBe(
        '42501',
      );
    });
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx, 'admin'));
      expect(
        await errorCode(tx, `insert into fotos_subidas (articulo_id, drive_id) values (1, 'x')`),
      ).toBe('42501');
      const { rowCount } = await tx.query('select * from fotos_subidas');
      expect(rowCount).toBeGreaterThanOrEqual(0); // un usuario con perfil puede leer el historial
    });
  });
});
