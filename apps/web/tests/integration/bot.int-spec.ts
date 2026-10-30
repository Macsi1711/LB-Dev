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

async function seedQueries(tx: pg.Client) {
  // Arranca de cero dentro de la transacción: el seed local también trae consultas.
  await tx.query('delete from consultas_bot');
  await tx.query('delete from usuarios_telegram');
  await tx.query(
    `insert into usuarios_telegram (chat_id, nombre, activo) values (10, 'Juan', true), (11, 'Ana', false)`,
  );
  await tx.query(
    `insert into consultas_bot (chat_id, fuente, texto, cantidad, error, created_at) values
       (10, 'texto', 'Pastilla Ónix', 0, null, now()),
       (10, 'audio', 'pastilla  onix', 0, null, now() - interval '1 day'),
       (10, 'texto', 'filtro gol', 3, null, now()),
       (99, 'texto', 'hola', null, 'no autorizado', now()),
       (10, 'foto', 'amortiguador', 0, null, now() - interval '40 days')`,
  );
}

describe('v_consultas_bot', () => {
  it('trae el nombre del usuario, o null si no está habilitado', async () => {
    await inTransaction(db, async (tx) => {
      await seedQueries(tx);
      await actAs(tx, await createUser(tx, 'admin'));
      const { rows } = await tx.query(
        `select chat_id, usuario_nombre from v_consultas_bot where texto in ('hola', 'filtro gol') order by chat_id`,
      );
      expect(rows).toEqual([
        { chat_id: '10', usuario_nombre: 'Juan' },
        { chat_id: '99', usuario_nombre: null },
      ]);
    });
  });

  it('un vendedor no ve las consultas: Métricas es del admin (ADR-013)', async () => {
    await inTransaction(db, async (tx) => {
      await seedQueries(tx);
      await actAs(tx, await createUser(tx, 'vendedor'));
      const { rows } = await tx.query('select * from v_consultas_bot');
      expect(rows).toHaveLength(0);
    });
  });
});

describe('ranking_sin_resultados', () => {
  it('agrupa sin tildes ni mayúsculas y solo mira los últimos días', async () => {
    await inTransaction(db, async (tx) => {
      await seedQueries(tx);
      await actAs(tx, await createUser(tx, 'admin'));
      const { rows } = await tx.query('select texto, veces from ranking_sin_resultados(30)');
      expect(rows).toEqual([{ texto: expect.stringMatching(/pastilla/i), veces: '2' }]);
    });
  });
});

describe('kpis_bot', () => {
  it('cuenta consultas de hoy, de la semana, % sin resultados y usuarios activos', async () => {
    await inTransaction(db, async (tx) => {
      await seedQueries(tx);
      await actAs(tx, await createUser(tx, 'admin'));
      const { rows } = await tx.query('select * from kpis_bot()');
      expect(rows[0]).toMatchObject({
        consultas_semana: '4',
        porcentaje_sin_resultados: '66.7', // 2 de 3 con cantidad (el no autorizado no cuenta)
        usuarios_activos: '1',
      });
      expect(Number(rows[0].consultas_hoy)).toBeGreaterThanOrEqual(2);
    });
  });
});
