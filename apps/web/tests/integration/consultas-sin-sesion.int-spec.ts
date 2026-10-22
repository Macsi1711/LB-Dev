import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { actAs, connect, createUser, inTransaction } from './db';

// Las búsquedas sin sesión también quedan en Métricas (ADR-010), con un tope para que nadie
// llene la tabla a propósito.

let db: pg.Client;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

async function asAnon(tx: pg.Client): Promise<void> {
  await tx.query('set local role anon');
}

async function lastWebQuery(tx: pg.Client) {
  const { rows } = await tx.query(
    `select fuente, texto, escuchado, cantidad, aproximada, user_id from consultas_bot
     where canal = 'web' order by id desc limit 1`,
  );
  return rows[0];
}

describe('registrar_consulta sin sesión', () => {
  it('queda en Métricas sin usuario, con el texto acortado', async () => {
    await inTransaction(db, async (tx) => {
      await asAnon(tx);
      await tx.query(`select registrar_consulta($1, null, null, 'texto', null, null, 3, false)`, [
        'pastilla '.repeat(40),
      ]);
      await tx.query('reset role');
      const row = await lastWebQuery(tx);
      expect(row).toMatchObject({ fuente: 'texto', escuchado: null, cantidad: 3, user_id: null });
      expect(row.texto.length).toBe(200);
    });
  });

  it('el audio y la foto quedan como tales, con lo escuchado acortado (ADR-011)', async () => {
    await inTransaction(db, async (tx) => {
      await asAnon(tx);
      await tx.query(
        `select registrar_consulta('pastilla onix', null, null, 'audio', $1, null, 2, false)`,
        ['pastillas'.repeat(60)],
      );
      await tx.query('reset role');
      const audio = await lastWebQuery(tx);
      expect(audio).toMatchObject({ fuente: 'audio', texto: 'pastilla onix', user_id: null });
      expect(audio.escuchado.length).toBe(500);

      await asAnon(tx);
      await tx.query(
        `select registrar_consulta('SYL2095', null, null, 'foto', 'SYL2095 FRENOS', null, 1, false)`,
      );
      await tx.query('reset role');
      expect(await lastWebQuery(tx)).toMatchObject({ fuente: 'foto', escuchado: 'SYL2095 FRENOS' });
    });
  });

  it('guarda como mucho 30 por minuto: las demás se descartan sin error', async () => {
    await inTransaction(db, async (tx) => {
      await tx.query(
        `insert into consultas_bot (canal, fuente, texto, cantidad, created_at)
         select 'web', 'texto', 'relleno', 0, now() - interval '10 seconds'
         from generate_series(1, 30)`,
      );
      const before = await tx.query(`select count(*)::int as n from consultas_bot`);
      await asAnon(tx);
      await tx.query(
        `select registrar_consulta('una más', null, null, 'texto', null, null, 1, false)`,
      );
      await tx.query('reset role');
      const after = await tx.query(`select count(*)::int as n from consultas_bot`);
      expect(after.rows[0].n).toBe(before.rows[0].n);

      // Con sesión no hay tope: el admin y los vendedores registran siempre.
      await actAs(tx, await createUser(tx, 'admin'));
      await tx.query(
        `select registrar_consulta('con sesión', null, null, 'texto', null, null, 1, false)`,
      );
      await tx.query('reset role');
      expect((await lastWebQuery(tx)).texto).toBe('con sesión');
    });
  });

  it('las de hace más de un minuto no cuentan para el tope', async () => {
    await inTransaction(db, async (tx) => {
      await tx.query(
        `insert into consultas_bot (canal, fuente, texto, cantidad, created_at)
         select 'web', 'texto', 'vieja', 0, now() - interval '2 minutes'
         from generate_series(1, 30)`,
      );
      await asAnon(tx);
      await tx.query(
        `select registrar_consulta('nueva', null, null, 'texto', null, null, 1, false)`,
      );
      await tx.query('reset role');
      expect((await lastWebQuery(tx)).texto).toBe('nueva');
    });
  });

  it('si no viene la cantidad, no vuelve a buscar: queda sin contar', async () => {
    await inTransaction(db, async (tx) => {
      await asAnon(tx);
      await tx.query(`select registrar_consulta('pastilla onix')`);
      await tx.query('reset role');
      expect(await lastWebQuery(tx)).toMatchObject({
        texto: 'pastilla onix',
        cantidad: null,
        aproximada: null,
      });
    });
  });
});
