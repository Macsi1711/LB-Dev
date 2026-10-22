import { describe, expect, it } from 'vitest';
import { canAccess, navigationFor } from './navigation';

describe('navigationFor', () => {
  it('al admin le muestra Mostrador, Fotos y Métricas', () => {
    expect(navigationFor('admin').map((i) => [i.label, i.path])).toEqual([
      ['Mostrador', '/'],
      ['Fotos', '/fotos'],
      ['Métricas', '/metricas'],
    ]);
  });

  it('sin sesión y al vendedor, el Mostrador y Fotos (ADR-011)', () => {
    for (const viewer of ['anonimo', 'vendedor'] as const)
      expect(navigationFor(viewer).map((i) => i.path)).toEqual(['/', '/fotos']);
  });
});

describe('canAccess', () => {
  it('deja entrar al admin a todas las secciones', () => {
    expect(canAccess('admin', '/')).toBe(true);
    expect(canAccess('admin', '/fotos')).toBe(true);
    expect(canAccess('admin', '/metricas/consultas')).toBe(true);
  });

  it('sin sesión y el vendedor entran al Mostrador y a Fotos, no a Métricas', () => {
    for (const viewer of ['anonimo', 'vendedor'] as const) {
      expect(canAccess(viewer, '/')).toBe(true);
      expect(canAccess(viewer, '/fotos')).toBe(true);
      expect(canAccess(viewer, '/metricas/consultas')).toBe(false);
    }
  });
});
