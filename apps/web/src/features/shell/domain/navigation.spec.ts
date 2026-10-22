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

  it('sin sesión y al vendedor, solo el Mostrador (ADR-010)', () => {
    for (const viewer of ['anonimo', 'vendedor'] as const)
      expect(navigationFor(viewer).map((i) => i.path)).toEqual(['/']);
  });
});

describe('canAccess', () => {
  it('deja entrar al admin a todas las secciones', () => {
    expect(canAccess('admin', '/')).toBe(true);
    expect(canAccess('admin', '/fotos')).toBe(true);
    expect(canAccess('admin', '/metricas/consultas')).toBe(true);
  });

  it('sin sesión y el vendedor solo entran al Mostrador', () => {
    for (const viewer of ['anonimo', 'vendedor'] as const) {
      expect(canAccess(viewer, '/')).toBe(true);
      expect(canAccess(viewer, '/fotos')).toBe(false);
      expect(canAccess(viewer, '/metricas/consultas')).toBe(false);
    }
  });
});
