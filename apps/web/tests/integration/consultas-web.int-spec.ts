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

async function lastWebQuery(tx: pg.Client) {
  const { rows } = await tx.query(
    `select canal, fuente, texto, escuchado, familia, solo_con_foto, cantidad, aproximada, error,
            usuario_nombre, user_id
     from v_consultas_bot where canal = 'web' order by id desc limit 1`,
  );
  return rows[0];
}

describe('registrar_consulta (consultas desde la web)', () => {
  it('guarda la consulta con quién la hizo, los filtros y cuántos resultados hubo', async () => {
    await inTransaction(db, async (tx) => {
      const user = await createUser(tx, 'vendedor');
      await actAs(tx, user);
      await tx.query(`select registrar_consulta('pastilla de freno para onix', 'PF', true)`);
      expect(await lastWebQuery(tx)).toMatchObject({
        canal: 'web',
        fuente: 'texto',
        texto: 'pastilla de freno para onix',
        familia: 'PF',
        solo_con_foto: true,
        cantidad: 1,
        aproximada: false,
        error: null,
        user_id: user,
        usuario_nombre: expect.any(String),
      });
    });
  });

  it('marca cuando la respuesta fue lo más parecido', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx));
      await tx.query(`select registrar_consulta('pastiya onix')`);
      expect(await lastWebQuery(tx)).toMatchObject({ aproximada: true, cantidad: 2 });
    });
  });

  it('guarda los audios y fotos, también los que no se entendieron', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx));
      await tx.query(`select registrar_consulta('bujia', null, null, 'audio', '¿Tenés bujías?')`);
      expect(await lastWebQuery(tx)).toMatchObject({
        fuente: 'audio',
        escuchado: '¿Tenés bujías?',
        cantidad: 1,
      });
      await tx.query(
        `select registrar_consulta(null, null, null, 'foto', null, 'No se pudo leer la foto')`,
      );
      expect(await lastWebQuery(tx)).toMatchObject({
        fuente: 'foto',
        texto: null,
        cantidad: null,
        error: 'No se pudo leer la foto',
      });
    });
  });

  it('sin perfil no se registra, y nadie escribe la tabla directo', async () => {
    await inTransaction(db, async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        `insert into auth.users (id, email, aud, role)
         values (gen_random_uuid(), 'sin-perfil@test.local', 'authenticated', 'authenticated')
         returning id`,
      );
      await tx.query('delete from perfiles where user_id = $1', [rows[0]!.id]);
      await actAs(tx, rows[0]!.id);
      expect(await errorCode(tx, `select registrar_consulta('onix')`)).toBe('42501');
    });
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx, 'admin'));
      expect(
        await errorCode(tx, `insert into consultas_bot (fuente, texto) values ('texto', 'x')`),
      ).toBe('42501');
    });
  });
});

describe('kpis_bot con la web', () => {
  it('usuarios activos cuenta a quienes consultaron en la semana, por la web o por Telegram', async () => {
    await inTransaction(db, async (tx) => {
      await tx.query('delete from consultas_bot');
      await tx.query(
        `insert into consultas_bot (chat_id, fuente, texto, cantidad) values (10, 'texto', 'onix', 2)`,
      );
      const a = await createUser(tx);
      const b = await createUser(tx);
      for (const user of [a, a, b]) {
        await tx.query('reset role');
        await actAs(tx, user);
        await tx.query(`select registrar_consulta('onix')`);
      }
      const { rows } = await tx.query('select consultas_hoy, usuarios_activos from kpis_bot()');
      expect(rows[0]).toEqual({ consultas_hoy: '4', usuarios_activos: '3' });
    });
  });
});

describe('registrar_consulta con la cantidad que ya sabe la web (migración 0019)', () => {
  it('la usa tal cual y no vuelve a buscar', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx));
      await tx.query(
        `select registrar_consulta('pastiya onix', p_cantidad => 7, p_aproximada => true)`,
      );
      expect(await lastWebQuery(tx)).toMatchObject({ cantidad: 7, aproximada: true });
    });
  });

  it('si no viene o no tiene sentido, cuenta en la base como antes', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx));
      await tx.query(`select registrar_consulta('pastiya onix', p_cantidad => -1)`);
      expect(await lastWebQuery(tx)).toMatchObject({ cantidad: 2, aproximada: true });
    });
  });
});
