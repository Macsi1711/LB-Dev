import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { actAs, connect, createUser, inTransaction } from './db';

let db: pg.Client;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

describe('sugerir_codigos', () => {
  it('sugiere primero el código contenido en el nombre del archivo', async () => {
    const { rows } = await db.query(
      `select codigo from sugerir_codigos(array['854000 copia.JPG'])`,
    );
    expect(rows[0]).toEqual({ codigo: '854000' });
    expect(rows.length).toBeLessThanOrEqual(5);
  });
});

describe('asignar_foto', () => {
  async function pendingPhoto(tx: pg.Client, driveId = 'DRIVE_abc-1') {
    const { rows } = await tx.query<{ id: string }>(
      `insert into fotos_sin_match (drive_id, archivo, candidatos, link)
       values ($1, 'onix.jpg', 'ONIX', 'https://drive.google.com/file/d/' || $1 || '/view')
       returning id`,
      [driveId],
    );
    return rows[0]!.id;
  }

  it('escribe el link con el formato de n8n y marca la foto como resuelta', async () => {
    await inTransaction(db, async (tx) => {
      const photoId = await pendingPhoto(tx);
      await actAs(tx, await createUser(tx, 'admin'));
      const { rows } = await tx.query(
        `select imagen_url, imagen_drive_id, tiene_foto from asignar_foto($1, 2)`,
        [photoId],
      );
      expect(rows[0]).toEqual({
        imagen_url: 'https://drive.google.com/file/d/DRIVE_abc-1/view?usp=drivesdk',
        imagen_drive_id: 'DRIVE_abc-1',
        tiene_foto: true,
      });
      const photo = await tx.query('select resuelto from fotos_sin_match where id = $1', [photoId]);
      expect(photo.rows[0]).toEqual({ resuelto: true });
    });
  });

  it('no deja asignar a un vendedor', async () => {
    await inTransaction(db, async (tx) => {
      const photoId = await pendingPhoto(tx);
      await actAs(tx, await createUser(tx, 'vendedor'));
      await expect(tx.query('select asignar_foto($1, 2)', [photoId])).rejects.toMatchObject({
        code: '42501',
      });
    });
  });

  it('no deja asignar dos veces la misma foto', async () => {
    await inTransaction(db, async (tx) => {
      const photoId = await pendingPhoto(tx);
      await actAs(tx, await createUser(tx, 'admin'));
      await tx.query('select asignar_foto($1, 2)', [photoId]);
      await expect(tx.query('select asignar_foto($1, 3)', [photoId])).rejects.toMatchObject({
        code: 'P0002',
      });
    });
  });
});

describe('sugerir_codigos por nombre', () => {
  it('encuentra el artículo por el nombre cuando el archivo no trae el código', async () => {
    const { rows } = await db.query(
      `select codigo from sugerir_codigos(array['filtro kangoo.jpg'])`,
    );
    expect(rows[0]).toEqual({ codigo: '120-34' });
  });

  it('el código en el nombre del archivo sigue ganando sobre el parecido del nombre', async () => {
    const { rows } = await db.query(
      `select codigo from sugerir_codigos(array['854000 pastilla onix.jpg'])`,
    );
    expect(rows[0]).toEqual({ codigo: '854000' });
  });
});
