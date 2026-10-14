import { describe, expect, it } from 'vitest';
import { canAccess, navigationFor } from './navigation';

describe('navigationFor', () => {
  it('al vendedor y al admin les muestra Mostrador, Fotos y Métricas', () => {
    for (const role of ['vendedor', 'admin'] as const)
      expect(navigationFor(role).map((i) => [i.label, i.path])).toEqual([
        ['Mostrador', '/'],
        ['Fotos', '/fotos'],
        ['Métricas', '/metricas'],
      ]);
  });
});

describe('canAccess', () => {
  it('deja entrar al vendedor y al admin a todas las secciones', () => {
    for (const role of ['vendedor', 'admin'] as const) {
      expect(canAccess(role, '/')).toBe(true);
      expect(canAccess(role, '/fotos')).toBe(true);
      expect(canAccess(role, '/metricas/consultas')).toBe(true);
    }
  });
});
