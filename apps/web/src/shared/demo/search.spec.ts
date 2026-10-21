import { describe, expect, it } from 'vitest';
import { compactTerm, containsTerm, searchTerms, termMatches } from './search';

describe('searchTerms (igual que terminos_busqueda() en la base)', () => {
  it('saca signos, palabras de relleno y plurales', () => {
    expect(searchTerms('¿Tenés pastillas de freno para el Onix?').sort()).toEqual([
      'freno',
      'onix',
      'pastilla',
    ]);
    expect(searchTerms('motores, llaves y filtros').sort()).toEqual(['filtro', 'llav', 'motor']);
  });

  it('usa las abreviaturas del catálogo', () => {
    expect(searchTerms('pastilla trasera izquierda').sort()).toEqual(['izq', 'pastilla', 'tras']);
  });

  it('respeta códigos y medidas, y si todo es relleno busca lo escrito', () => {
    expect(searchTerms('120-33 rosca 3/4').sort()).toEqual(['120-33', '3/4', 'rosca']);
    expect(searchTerms('para')).toEqual(['para']);
  });
});

describe('termMatches', () => {
  it('cuenta si el término aparece o si se le parece a una palabra (error de tipeo)', () => {
    expect(termMatches('pastilla', 'pastilla freno del. chevrolet onix')).toBe(true);
    expect(termMatches('pastiya', 'pastilla freno del. chevrolet onix')).toBe(true);
    expect(termMatches('amortiguador', 'pastilla freno del. chevrolet onix')).toBe(false);
  });
});

describe('compactTerm (igual que termino_compacto() en la base)', () => {
  it('compacta los términos que parecen código', () => {
    expect(compactTerm('ph4386')).toBe('ph4386');
    expect(compactTerm('pd/363')).toBe('pd363');
    expect(compactTerm('adb-2533')).toBe('adb2533');
    expect(compactTerm('36.060')).toBe('36060');
  });

  it('no compacta palabras, números sueltos ni medidas cortas', () => {
    expect(compactTerm('pastilla')).toBeNull();
    expect(compactTerm('1234')).toBeNull();
    expect(compactTerm('3/4')).toBeNull();
    expect(compactTerm('x4')).toBeNull();
  });
});

describe('containsTerm', () => {
  it('encuentra el código con o sin espacios, guiones o barras', () => {
    expect(containsTerm('ph4386', 'filtro aceite equivalente fram ph 4386')).toBe(true);
    expect(containsTerm('ph-4386', 'filtro aceite equivalente fram ph 4386')).toBe(true);
    expect(containsTerm('pd363', 'pd/363 pastilla freno')).toBe(true);
    expect(containsTerm('36.060', '36060 bomba de agua')).toBe(true);
  });

  it('no junta números sueltos', () => {
    expect(containsTerm('1234', 'tornillo rueda rosca 1/2 34 mm')).toBe(false);
  });

  it('una palabra común se busca como siempre', () => {
    expect(containsTerm('filtro', 'filtro aceite')).toBe(true);
    expect(containsTerm('bomba', 'filtro aceite')).toBe(false);
  });
});
