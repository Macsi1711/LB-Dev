import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { codigoDeError, conectar, DATABASE_URL, enTransaccion } from './db';

// Contraseñas SOLO del Postgres local. En producción las carga el admin a mano (docs/n8n.md).
const CLAVE_LOCAL = { n8n_bot: 'n8n_bot_local', n8n_app: 'n8n_app_local' } as const;

function urlComo(rol: keyof typeof CLAVE_LOCAL): string {
  const url = new URL(DATABASE_URL);
  url.username = rol;
  url.password = CLAVE_LOCAL[rol];
  return url.toString();
}

// SQL que genera la IA del bot (flujo "Lois SQL"), tal cual.
const SQL_DEL_BOT = (familia: string) => `
WITH resultados AS (
  SELECT "Codigo", "Nombre artículo", "Descripción", "codigo  familia", "Imagen", '' AS observaciones
  FROM articulos WHERE "codigo  familia" = '${familia}' ORDER BY "Nombre artículo" LIMIT 20
)
SELECT *, FALSE AS sin_resultados FROM resultados
UNION ALL SELECT NULL, NULL, NULL, NULL, NULL, NULL, TRUE WHERE NOT EXISTS (SELECT 1 FROM resultados);`;

let admin: pg.Client;
let bot: pg.Client;
let app: pg.Client;

beforeAll(async () => {
  admin = await conectar();
  for (const [rol, clave] of Object.entries(CLAVE_LOCAL)) {
    await admin.query(`alter role ${rol} password '${clave}'`);
  }
  bot = await conectar(urlComo('n8n_bot'));
  app = await conectar(urlComo('n8n_app'));
});
afterAll(async () => {
  await Promise.all([admin.end(), bot.end(), app.end()]);
});

describe('n8n_bot (SQL generado por la IA)', () => {
  it('sigue ejecutando el SQL del bot con resultados', async () => {
    const { rows } = await bot.query(SQL_DEL_BOT('PF'));
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
    const { rows } = await bot.query(SQL_DEL_BOT('NO-EXISTE'));
    expect(rows).toEqual([expect.objectContaining({ Codigo: null, sin_resultados: true })]);
  });

  it('puede usar unaccent y similarity como antes', async () => {
    const { rows } = await bot.query(
      `select "Codigo" from articulos where unaccent("Nombre artículo") ilike '%bujia%'`,
    );
    expect(rows).toEqual([{ Codigo: 'BUJ-10' }]);
  });

  it('no puede borrar: la transacción es de solo lectura', async () => {
    await enTransaccion(bot, async (tx) => {
      expect(await codigoDeError(tx, 'delete from articulos')).toBe('25006');
    });
  });

  it('no puede borrar ni modificar aunque desactive el solo lectura (prompt injection)', async () => {
    await enTransaccion(bot, async (tx) => {
      await tx.query('set transaction read write');
      expect(await codigoDeError(tx, 'delete from articulos')).toBe('42501');
      expect(await codigoDeError(tx, `update articulos set "Imagen" = 'x'`)).toBe('42501');
      expect(await codigoDeError(tx, 'drop table articulos')).toBe('42501');
    });
  });

  it('no puede leer otras tablas', async () => {
    await enTransaccion(bot, async (tx) => {
      expect(await codigoDeError(tx, 'select * from usuarios_telegram')).toBe('42501');
      expect(await codigoDeError(tx, 'select * from consultas_bot')).toBe('42501');
    });
  });

  it('corta las consultas que tardan más de 5 segundos', async () => {
    await enTransaccion(bot, async (tx) => {
      expect(await codigoDeError(tx, 'select pg_sleep(6)')).toBe('57014');
    });
  });
});

describe('n8n_app (lista blanca, log y fotos)', () => {
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
    await enTransaccion(app, async (tx) => {
      const r = await tx.query(
        `insert into consultas_bot (chat_id, fuente, texto, sql_generado, cantidad, error)
         values ($1, 'audio', 'pastilla onix', 'select 1', 0, null)`,
        [555],
      );
      expect(r.rowCount).toBe(1);
    });
  });

  it('escribe la foto con la query del flujo "Lois Fotos"', async () => {
    await enTransaccion(app, async (tx) => {
      const { rows } = await tx.query(
        `UPDATE articulos SET "Imagen" = $1 WHERE upper(trim("Codigo")) = ANY($2)
         RETURNING "Codigo", "Nombre artículo", "Imagen"`,
        ['https://drive.google.com/file/d/NUEVO/view?usp=drivesdk', ['854001', 'BUJ-10']],
      );
      expect(rows.map((r) => r.Codigo).sort()).toEqual(['854001', 'BUJ-10']);
    });
  });

  it('registra fotos sin match sin duplicar por drive_id', async () => {
    await enTransaccion(app, async (tx) => {
      const sql = `insert into fotos_sin_match (drive_id, archivo, candidatos, link)
                   values ($1, $2, $3, $4) on conflict (drive_id) do nothing`;
      const valores = [
        'DRV1',
        'onix.jpg',
        'ONIX|ONIX.JPG',
        'https://drive.google.com/file/d/DRV1/view',
      ];
      expect((await tx.query(sql, valores)).rowCount).toBe(1);
      expect((await tx.query(sql, valores)).rowCount).toBe(0);
    });
  });

  it('no puede tocar otras columnas ni borrar', async () => {
    await enTransaccion(app, async (tx) => {
      expect(await codigoDeError(tx, `update articulos set "Nombre artículo" = 'x'`)).toBe('42501');
      expect(await codigoDeError(tx, 'delete from articulos')).toBe('42501');
      expect(await codigoDeError(tx, 'delete from consultas_bot')).toBe('42501');
      expect(await codigoDeError(tx, 'select * from consultas_bot')).toBe('42501');
    });
  });
});
