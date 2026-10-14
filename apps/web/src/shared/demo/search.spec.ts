import { describe, expect, it } from 'vitest';
import { searchTerms, termMatches } from './search';

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
