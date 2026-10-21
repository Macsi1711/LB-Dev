import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { actAs, connect, inTransaction } from './db';

// En el catálogo el mismo código aparece como "PH 4386", "ADB-2533" o "PD/363", y el vendedor
// (o la foto) lo escribe pegado, o al revés. La búsqueda tiene que encontrarlo igual (0023).

const SELLER = 'a0000000-0000-4000-8000-000000000002';

let db: pg.Client;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

const ARTICLES = `
  insert into articulos ("Codigo", "Nombre artículo", "Descripción", observaciones) values
    ('FR-1', 'FILTRO ACEITE FRAM', 'Equivalente FRAM PH 4386', null),
    ('ADB-2533', 'PASTILLA FRENO ANGRES', null, null),
    ('RX-9', 'PASTILLA FRENO ALFA', null, 'Reemplaza a la ADB2533'),
    ('SYL1377', 'PASTILLA FRENO SYL', null, null),
    ('PD/363', 'PASTILLA FRENO PD', null, null),
    ('36060', 'BOMBA DE AGUA SELVIR', null, null),
    ('TOR-1', 'TORNILLO RUEDA', 'Rosca 1/2 34 mm', null)`;

/** Corre `fn` con los artículos de prueba cargados, como el vendedor del seed. */
async function withArticles<T>(fn: (tx: pg.Client) => Promise<T>): Promise<T> {
  return inTransaction(db, async (tx) => {
    await tx.query(ARTICLES);
    await actAs(tx, SELLER);
    return fn(tx);
  });
}

async function search(tx: pg.Client, q: string): Promise<string[]> {
  const { rows } = await tx.query<{ codigo: string }>('select codigo from buscar_articulos($1)', [
    q,
  ]);
  return rows.map((r) => r.codigo);
}

async function summary(tx: pg.Client, q: string) {
  const { rows } = await tx.query<{ total: string; aproximada: boolean }>(
    'select * from resumen_busqueda($1)',
    [q],
  );
  return { total: Number(rows[0]!.total), aproximada: rows[0]!.aproximada };
}

/** Solo el filtro estricto (sin "lo más parecido"), ordenado por código. */
async function strict(tx: pg.Client, q: string): Promise<string[]> {
  const { rows } = await tx.query<{ codigo: string }>(
    'select codigo from filtrar_articulos($1) order by codigo',
    [q],
  );
  return rows.map((r) => r.codigo);
}

describe('códigos con o sin espacios, guiones, puntos o barras', () => {
  it('pegado encuentra el que en el catálogo tiene espacio', async () => {
    await withArticles(async (tx) => {
      expect(await search(tx, 'PH4386')).toEqual(['FR-1']);
      expect(await summary(tx, 'ph4386')).toEqual({ total: 1, aproximada: false });
    });
  });

  it('con guion encuentra el que tiene espacio, y separado encuentra el que tiene guion', async () => {
    await withArticles(async (tx) => {
      expect(await strict(tx, 'PH-4386')).toEqual(['FR-1']);
      expect(await summary(tx, 'PH-4386')).toEqual({ total: 1, aproximada: false });
      expect(await strict(tx, 'ADB 2533')).toEqual(['ADB-2533', 'RX-9']);
    });
  });

  it('pegado encuentra el que tiene guion o barra', async () => {
    await withArticles(async (tx) => {
      expect(await strict(tx, 'ADB2533')).toEqual(['ADB-2533', 'RX-9']);
      expect(await search(tx, 'PD363')).toEqual(['PD/363']);
    });
  });

  it('con separadores encuentra el que está pegado', async () => {
    await withArticles(async (tx) => {
      expect(await search(tx, 'SYL-1377')).toEqual(['SYL1377']);
      expect(await search(tx, 'syl 1377')).toEqual(['SYL1377']);
      expect(await search(tx, '36.060')).toEqual(['36060']);
    });
  });

  it('el artículo con ese código va primero, antes de los que lo nombran', async () => {
    await withArticles(async (tx) => {
      expect(await search(tx, 'ADB2533')).toEqual(['ADB-2533', 'RX-9']);
      expect(await search(tx, 'adb 2533')).toEqual(['ADB-2533', 'RX-9']);
    });
  });

  it('se combina con las otras palabras', async () => {
    await withArticles(async (tx) => {
      expect(await strict(tx, 'filtro fram ph4386')).toEqual(['FR-1']);
      expect(await strict(tx, 'bomba ph4386')).toEqual([]);
    });
  });

  it('no junta números sueltos: 1234 no es "1/2 34"', async () => {
    await withArticles(async (tx) => {
      expect(await strict(tx, '1234')).toEqual([]);
      expect(await strict(tx, 'tornillo 1234')).toEqual([]);
    });
  });

  it('si falta una palabra, lo más parecido también cuenta el código pegado', async () => {
    await withArticles(async (tx) => {
      expect(await search(tx, 'filtro ph4386 xyzw')).toEqual(['FR-1']);
      expect(await summary(tx, 'filtro ph4386 xyzw')).toEqual({ total: 1, aproximada: true });
    });
  });
});

describe('texto compacto', () => {
  it('deja solo letras y números, sin tildes ni mayúsculas', async () => {
    const { rows } = await db.query<{ t: string }>(
      `select articulo_texto_compacto(' PD/363 ', 'Pastilla Fréno', 'PH 4386', null) as t`,
    );
    expect(rows[0]!.t).toBe('pd363pastillafrenoph4386');
  });

  it('la búsqueda por código pegado puede usar su índice trigram', async () => {
    await inTransaction(db, async (tx) => {
      await tx.query('set local enable_seqscan = off');
      const { rows } = await tx.query<{ 'QUERY PLAN': string }>(
        `explain select v.id from v_articulos v
         where articulo_texto_compacto(v.codigo, v.nombre, v.descripcion, v.observaciones)
               like '%ph4386%'`,
      );
      const plan = rows.map((r) => r['QUERY PLAN']).join('\n');
      expect(plan).toContain('articulos_texto_compacto_trgm_idx');
    });
  });
});
