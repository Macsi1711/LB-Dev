import { describe, expect, it } from 'vitest';
import { canAccess, navigationFor } from './navigation';

describe('navigationFor', () => {
  it('al admin le muestra Mostrador, Fotos, Productos, Métricas y Vendedores', () => {
    expect(navigationFor('admin').map((i) => [i.label, i.path])).toEqual([
      ['Mostrador', '/'],
      ['Fotos', '/fotos'],
      ['Productos', '/productos'],
      ['Métricas', '/metricas'],
      ['Vendedores', '/vendedores'],
    ]);
  });

  it('al vendedor, el Mostrador y Fotos', () => {
    expect(navigationFor('vendedor').map((i) => i.path)).toEqual(['/', '/fotos']);
  });

  it('sin sesión, nada: el login es obligatorio (ADR-013)', () => {
    expect(navigationFor('anonimo')).toEqual([]);
  });
});

describe('canAccess', () => {
  it('deja entrar al admin a todas las secciones', () => {
    expect(canAccess('admin', '/')).toBe(true);
    expect(canAccess('admin', '/fotos')).toBe(true);
    expect(canAccess('admin', '/productos')).toBe(true);
    expect(canAccess('admin', '/metricas/consultas')).toBe(true);
    expect(canAccess('admin', '/vendedores')).toBe(true);
  });

  it('el vendedor entra al Mostrador y a Fotos, no a Productos, Métricas ni Vendedores', () => {
    expect(canAccess('vendedor', '/')).toBe(true);
    expect(canAccess('vendedor', '/fotos')).toBe(true);
    expect(canAccess('vendedor', '/productos')).toBe(false);
    expect(canAccess('vendedor', '/metricas/consultas')).toBe(false);
    expect(canAccess('vendedor', '/vendedores')).toBe(false);
  });

  it('sin sesión no entra a ninguna sección, ni al Mostrador (ADR-013)', () => {
    for (const path of ['/', '/fotos', '/productos', '/metricas', '/cualquier-cosa'])
      expect(canAccess('anonimo', path), path).toBe(false);
  });
});
