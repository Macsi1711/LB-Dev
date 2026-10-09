import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { conectar, enTransaccion } from './db';

let db: pg.Client;
beforeAll(async () => {
  db = await conectar();
});
afterAll(async () => {
  await db.end();
});

async function buscar(q: string, familia: string | null = null, conFoto: boolean | null = null) {
  const { rows } = await db.query<{ codigo: string }>(
    'select codigo from buscar_articulos($1, $2, $3)',
    [q, familia, conFoto],
  );
  return rows.map((r) => r.codigo);
}

describe('buscar_articulos', () => {
  it('exige que estén todas las palabras (AND)', async () => {
    expect(await buscar('pastilla onix')).toEqual(['854000', '854001']);
  });

  it('ignora tildes y mayúsculas', async () => {
    expect(await buscar('bujia')).toEqual(['BUJ-10']);
    expect(await buscar('BUJÍA iridium')).toEqual(['BUJ-10']);
  });

  it('busca también en descripción y observaciones', async () => {
    expect(await buscar('eje trasero')).toEqual(['854001']);
    expect(await buscar('consultar stock')).toEqual(['854001']);
  });

  it('pone primero el código exacto y después los que empiezan con lo buscado', async () => {
    const codigos = await buscar('8540');
    expect(codigos[0]).toBe('8540');
    expect(codigos.slice(1).every((c) => c.startsWith('8540'))).toBe(true);
  });

  it('encuentra el código aunque en la tabla tenga espacios', async () => {
    expect(await buscar('120-33')).toEqual(['120-33']);
  });

  it('filtra por familia y por foto', async () => {
    expect(await buscar('', 'PF', true)).toEqual(['854000']);
    expect((await buscar('', 'PF', false)).sort()).toEqual(['8540', '854001', '854100']);
  });

  it('toma % y _ como texto literal', async () => {
    await enTransaccion(db, async (tx) => {
      await tx.query(
        `insert into articulos ("Codigo", "Nombre artículo") values ('T1', 'KIT 50% OFF'), ('T2', 'KIT 500')`,
      );
      const { rows } = await tx.query('select codigo from buscar_articulos($1)', ['50%']);
      expect(rows).toEqual([{ codigo: 'T1' }]);
    });
  });

  it('pagina y cuenta con los mismos filtros', async () => {
    const total = await db.query<{ n: string }>(`select contar_articulos('pastilla') as n`);
    expect(Number(total.rows[0]!.n)).toBe(4);
    const pag1 = await db.query(
      `select codigo from buscar_articulos('pastilla', null, null, 3, 0)`,
    );
    const pag2 = await db.query(
      `select codigo from buscar_articulos('pastilla', null, null, 3, 3)`,
    );
    expect(pag1.rowCount).toBe(3);
    expect(pag2.rowCount).toBe(1);
  });
});

describe('stats_fotos', () => {
  it('devuelve el total primero y deja afuera las familias que no son producto', async () => {
    await enTransaccion(db, async (tx) => {
      await tx.query(
        `insert into familias (codigo, nombre, es_producto) values ('999', 'VARIOS', false)
         on conflict (codigo) do update set es_producto = false`,
      );
      const { rows } = await tx.query('select * from stats_fotos()');
      expect(rows[0]).toMatchObject({ es_total: true, familia_codigo: null });
      expect(rows.some((r) => r.familia_codigo === '999')).toBe(false);
      const pf = rows.find((r) => r.familia_codigo === 'PF');
      expect(pf).toMatchObject({ total: '4', con_foto: '1', porcentaje: '25.0' });
    });
  });
});
