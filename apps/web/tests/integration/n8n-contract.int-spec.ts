import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { errorCode, connect, DATABASE_URL, inTransaction } from './db';

// Contraseñas SOLO del Postgres local. En producción las carga el admin a mano (docs/n8n.md).
const LOCAL_PASSWORDS = { n8n_bot: 'n8n_bot_local', n8n_app: 'n8n_app_local' } as const;

function urlAs(role: keyof typeof LOCAL_PASSWORDS): string {
  const url = new URL(DATABASE_URL);
  url.username = role;
  url.password = LOCAL_PASSWORDS[role];
  return url.toString();
}

// SQL que genera la IA del bot (flujo "Lois SQL"), tal cual.
const BOT_SQL = (family: string) => `
WITH resultados AS (
  SELECT "Codigo", "Nombre artículo", "Descripción", "codigo  familia", "Imagen", '' AS observaciones
  FROM articulos WHERE "codigo  familia" = '${family}' ORDER BY "Nombre artículo" LIMIT 20
)
SELECT *, FALSE AS sin_resultados FROM resultados
UNION ALL SELECT NULL, NULL, NULL, NULL, NULL, NULL, TRUE WHERE NOT EXISTS (SELECT 1 FROM resultados);`;

let admin: pg.Client;
let bot: pg.Client;
let app: pg.Client;

beforeAll(async () => {
  admin = await connect();
  for (const [role, password] of Object.entries(LOCAL_PASSWORDS)) {
    await admin.query(`alter role ${role} password '${password}'`);
  }
  bot = await connect(urlAs('n8n_bot'));
  app = await connect(urlAs('n8n_app'));
});
afterAll(async () => {
  await Promise.all([admin.end(), bot.end(), app.end()]);
});

describe('n8n_bot (SQL generado por la IA)', () => {
  it('sigue ejecutando el SQL del bot con resultados', async () => {
    const { rows } = await bot.query(BOT_SQL('PF'));
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({ 'codigo  familia': 'PF', sin_resultados: false });
    expect(Object.keys(rows[0])).toEqual([
      'Codigo',
      'Nombre artículo',
      'Descripción',
      'codigo  familia',
      'Imagen',
      'observaciones',
      'sin_resultados',
    ]);
  });

  it('sigue ejecutando el SQL del bot sin resultados', async () => {
    const { rows } = await bot.query(BOT_SQL('NO-EXISTE'));
    expect(rows).toEqual([expect.objectContaining({ Codigo: null, sin_resultados: true })]);
  });

  it('puede usar unaccent y similarity como antes', async () => {
    const { rows } = await bot.query(
      `select "Codigo" from articulos where unaccent("Nombre artículo") ilike '%bujia%'`,
    );
    expect(rows).toEqual([{ Codigo: 'BUJ-10' }]);
  });

  it('no puede borrar: la transacción es de solo lectura', async () => {
    await inTransaction(bot, async (tx) => {
      expect(await errorCode(tx, 'delete from articulos')).toBe('25006');
    });
  });

  it('no puede borrar ni modificar aunque desactive el solo lectura (prompt injection)', async () => {
    await inTransaction(bot, async (tx) => {
      await tx.query('set transaction read write');
      expect(await errorCode(tx, 'delete from articulos')).toBe('42501');
      expect(await errorCode(tx, `update articulos set "Imagen" = 'x'`)).toBe('42501');
      expect(await errorCode(tx, 'drop table articulos')).toBe('42501');
    });
  });

  it('no puede leer otras tablas', async () => {
    await inTransaction(bot, async (tx) => {
      expect(await errorCode(tx, 'select * from usuarios_telegram')).toBe('42501');
      expect(await errorCode(tx, 'select * from consultas_bot')).toBe('42501');
    });
  });

  it('corta las consultas que tardan más de 5 segundos', async () => {
    await inTransaction(bot, async (tx) => {
      expect(await errorCode(tx, 'select pg_sleep(6)')).toBe('57014');
    });
  });
});

describe('n8n_app (lista blanca y log)', () => {
  it('lee la lista blanca', async () => {
    // n8n_app usa otra conexión: el dato tiene que estar commiteado.
    await admin.query(`insert into usuarios_telegram (chat_id, nombre) values (555, 'Ana')`);
    try {
      const { rows } = await app.query(
        'select activo from usuarios_telegram where chat_id = $1',
        [555],
      );
      expect(rows).toEqual([{ activo: true }]);
    } finally {
      await admin.query('delete from usuarios_telegram where chat_id = 555');
    }
  });

  it('registra consultas del bot', async () => {
    await inTransaction(app, async (tx) => {
      const r = await tx.query(
        `insert into consultas_bot (chat_id, fuente, texto, sql_generado, cantidad, error)
         values ($1, 'audio', 'pastilla onix', 'select 1', 0, null)`,
        [555],
      );
      expect(r.rowCount).toBe(1);
    });
  });

  it('no puede tocar otras columnas ni borrar', async () => {
    await inTransaction(app, async (tx) => {
      expect(await errorCode(tx, `update articulos set "Nombre artículo" = 'x'`)).toBe('42501');
      // "Lois Fotos" (Drive) está retirado: ya nadie escribe la foto desde n8n.
      expect(await errorCode(tx, `update articulos set "Imagen" = 'x'`)).toBe('42501');
      expect(await errorCode(tx, 'delete from articulos')).toBe('42501');
      expect(await errorCode(tx, 'delete from consultas_bot')).toBe('42501');
      expect(await errorCode(tx, 'select * from consultas_bot')).toBe('42501');
    });
  });
});
