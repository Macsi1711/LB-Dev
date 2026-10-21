import { describe, expect, it } from 'vitest';
import { createDemoCounter } from './demo-counter';

const state = (q: string) => ({ q, family: null, withPhoto: false });

async function codes(q: string) {
  const list = await createDemoCounter().search(state(q), 0, 40);
  return list.map((a) => a.code);
}

describe('createDemoCounter: códigos con o sin separadores (como la migración 0023)', () => {
  it('pegado o con guion encuentra el código que en el catálogo tiene espacio', async () => {
    expect(await codes('PH4386')).toEqual(['120-40']);
    expect(await codes('ph-4386')).toEqual(['120-40']);
    expect(await createDemoCounter().summary(state('PH4386'))).toEqual({
      total: 1,
      approximate: false,
    });
  });

  it('el artículo con ese código va primero, aunque se escriba con otro separador', async () => {
    expect((await codes('120.34'))[0]).toBe('120-34');
    expect((await codes('120 34'))[0]).toBe('120-34');
  });
});
