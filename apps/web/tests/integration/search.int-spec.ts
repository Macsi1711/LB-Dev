import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { actAs, connect, inTransaction } from './db';

// Las búsquedas corren como el vendedor del seed, igual que desde la web: sin perfil no
// devuelven nada (migración 0018).
const SELLER = 'a0000000-0000-4000-8000-000000000002';

let db: pg.Client;
let seller: pg.Client;
beforeAll(async () => {
  db = await connect();
  seller = await connect();
  await seller.query(`select set_config('request.jwt.claims', $1, false)`, [
    JSON.stringify({ sub: SELLER, role: 'authenticated' }),
  ]);
  await seller.query('set role authenticated');
});
afterAll(async () => {
  await db.end();
  await seller.end();
});

async function search(q: string, family: string | null = null, withPhoto: boolean | null = null) {
  const { rows } = await seller.query<{ codigo: string }>(
    'select codigo from buscar_articulos($1, $2, $3)',
    [q, family, withPhoto],
  );
  return rows.map((r) => r.codigo);
}

describe('buscar_articulos', () => {
  it('exige que estén todas las palabras (AND)', async () => {
    expect(await search('pastilla onix')).toEqual(['854000', '854001']);
  });

  it('ignora tildes y mayúsculas', async () => {
    expect(await search('bujia')).toEqual(['BUJ-10']);
    expect(await search('BUJÍA iridium')).toEqual(['BUJ-10']);
  });

  it('busca también en descripción y observaciones', async () => {
    expect(await search('eje trasero')).toEqual(['854001']);
    expect(await search('consultar stock')).toEqual(['854001']);
  });

  it('pone primero el código exacto y después los que empiezan con lo buscado', async () => {
    const codes = await search('8540');
    expect(codes[0]).toBe('8540');
    expect(codes.slice(1).every((c) => c.startsWith('8540'))).toBe(true);
  });

  it('encuentra el código aunque en la tabla tenga espacios', async () => {
    expect(await search('120-33')).toEqual(['120-33']);
  });

  it('filtra por familia y por foto', async () => {
    expect(await search('', 'PF', true)).toEqual(['854000']);
    expect((await search('', 'PF', false)).sort()).toEqual(['8540', '854001', '854100']);
  });

  it('toma % y _ como texto literal', async () => {
    await inTransaction(db, async (tx) => {
      await tx.query(
        `insert into articulos ("Codigo", "Nombre artículo") values ('T1', 'KIT 50% OFF'), ('T2', 'KIT 500')`,
      );
      await actAs(tx, SELLER);
      const { rows } = await tx.query('select codigo from buscar_articulos($1)', ['50%']);
      expect(rows).toEqual([{ codigo: 'T1' }]);
    });
  });

  it('pagina y cuenta con los mismos filtros', async () => {
    const count = await seller.query<{ n: string }>(`select contar_articulos('pastilla') as n`);
    expect(Number(count.rows[0]!.n)).toBe(4);
    const page1 = await seller.query(
      `select codigo from buscar_articulos('pastilla', null, null, 3, 0)`,
    );
    const page2 = await seller.query(
      `select codigo from buscar_articulos('pastilla', null, null, 3, 3)`,
    );
    expect(page1.rowCount).toBe(3);
    expect(page2.rowCount).toBe(1);
  });
});

describe('búsqueda en lenguaje natural', () => {
  async function terms(q: string) {
    const { rows } = await db.query<{ t: string[] }>('select terminos_busqueda($1) as t', [q]);
    return [...rows[0]!.t].sort();
  }

  async function summary(q: string) {
    const { rows } = await seller.query<{ total: string; aproximada: boolean }>(
      'select * from resumen_busqueda($1)',
      [q],
    );
    return { total: Number(rows[0]!.total), aproximada: rows[0]!.aproximada };
  }

  it('saca las palabras de relleno, los signos y los plurales', async () => {
    expect(await terms('¿Tenés pastillas de freno para el Onix?')).toEqual([
      'freno',
      'onix',
      'pastilla',
    ]);
    expect(await terms('motores, llaves y filtros')).toEqual(['filtro', 'llav', 'motor']);
  });

  it('respeta los códigos y las medidas', async () => {
    expect(await terms('120-33 rosca 3/4')).toEqual(['120-33', '3/4', 'rosca']);
  });

  it('si todo es relleno, busca lo que se escribió', async () => {
    expect(await terms('para')).toEqual(['para']);
  });

  it('encuentra con frases como las del mostrador', async () => {
    expect((await search('pastilla de freno para onix')).sort()).toEqual(['854000', '854001']);
    expect((await search('tenés pastillas de freno?')).sort()).toEqual([
      '8540',
      '854000',
      '854001',
      '854100',
    ]);
    expect(await search('filtros de aceite para kangoo')).toEqual(['120-34']);
  });

  it('entiende las abreviaturas del catálogo', async () => {
    expect(await search('pastilla trasera onix')).toEqual(['854001']);
    expect((await search('pastilla delantera chevrolet')).sort()).toEqual(['854000']);
  });

  it('si no hay nada con todas las palabras, muestra lo más parecido y lo avisa', async () => {
    const codes = await search('pastiya onix');
    expect(codes.slice(0, 2).sort()).toEqual(['854000', '854001']);
    expect(await summary('pastiya onix')).toEqual({ total: codes.length, aproximada: true });
  });

  it('lo exacto no se marca como aproximado', async () => {
    expect(await summary('pastilla onix')).toEqual({ total: 2, aproximada: false });
  });

  it('si no se parece a nada, no inventa', async () => {
    expect(await search('xyzw')).toEqual([]);
    expect(await summary('xyzw')).toEqual({ total: 0, aproximada: false });
  });
});

describe('stats_fotos', () => {
  it('devuelve el total primero y deja afuera las familias que no son producto', async () => {
    await inTransaction(db, async (tx) => {
      await tx.query(
        `insert into familias ("Código", "Nombre", es_producto)
         select '999', 'VARIOS', false
         where not exists (select 1 from familias where "Código" = '999')`,
      );
      const { rows } = await tx.query('select * from stats_fotos()');
      expect(rows[0]).toMatchObject({ es_total: true, familia_codigo: null });
      expect(rows.some((r) => r.familia_codigo === '999')).toBe(false);
      const pf = rows.find((r) => r.familia_codigo === 'PF');
      expect(pf).toMatchObject({ total: '4', con_foto: '1', porcentaje: '25.0' });
    });
  });
});

describe('v_articulos_sin_foto', () => {
  it('lista los artículos sin foto, sin las familias internas', async () => {
    const { rows } = await db.query<{ codigo: string }>(
      'select codigo from v_articulos_sin_foto order by codigo',
    );
    const codes = rows.map((r) => r.codigo);
    expect(codes).toContain('854001');
    expect(codes).not.toContain('854000'); // tiene foto
    expect(codes).not.toContain('999001'); // familia 999: no es producto
    expect(codes).not.toContain('DV01'); // familia DV: no es producto
  });
});
