import { describe, expect, it } from 'vitest';
import { canAccess, navigationFor } from './navigation';

describe('navigationFor', () => {
  it('a un vendedor solo le muestra el Mostrador', () => {
    expect(navigationFor('vendedor').map((i) => i.label)).toEqual(['Mostrador']);
  });

  it('a un admin le muestra Mostrador, Fotos y Bot', () => {
    expect(navigationFor('admin').map((i) => [i.label, i.path])).toEqual([
      ['Mostrador', '/'],
      ['Fotos', '/fotos'],
      ['Bot', '/bot'],
    ]);
  });
});

describe('canAccess', () => {
  it('deja entrar al vendedor solo al Mostrador', () => {
    expect(canAccess('vendedor', '/')).toBe(true);
    expect(canAccess('vendedor', '/fotos')).toBe(false);
    expect(canAccess('vendedor', '/bot/consultas')).toBe(false);
  });

  it('deja entrar al admin a todo', () => {
    expect(canAccess('admin', '/fotos')).toBe(true);
    expect(canAccess('admin', '/bot/consultas')).toBe(true);
  });
});
