import { describe, expect, it } from 'vitest';
import { emptyResultsMessage, parseSearchState, toSearchParams } from './search-state';

describe('parseSearchState', () => {
  it('lee la búsqueda de la URL (?q=&familia=&foto=)', () => {
    expect(parseSearchState(new URLSearchParams('q=pastilla+onix&familia=PF&foto=1'))).toEqual({
      q: 'pastilla onix',
      family: 'PF',
      withPhoto: true,
    });
  });

  it('usa valores vacíos si no hay parámetros', () => {
    expect(parseSearchState(new URLSearchParams(''))).toEqual({
      q: '',
      family: null,
      withPhoto: false,
    });
  });

  it('ignora una familia vacía y cualquier foto distinta de 1', () => {
    expect(parseSearchState(new URLSearchParams('familia=&foto=si'))).toMatchObject({
      family: null,
      withPhoto: false,
    });
  });
});

describe('toSearchParams', () => {
  it('escribe solo lo que no es el valor por defecto', () => {
    expect(toSearchParams({ q: '  onix ', family: null, withPhoto: false }).toString()).toBe(
      'q=onix',
    );
    expect(toSearchParams({ q: '', family: 'PF', withPhoto: true }).toString()).toBe(
      'familia=PF&foto=1',
    );
  });
});

describe('emptyResultsMessage', () => {
  it('sugiere menos palabras o sacar el filtro de familia', () => {
    expect(emptyResultsMessage({ q: 'pastilla xyz', family: 'PF', withPhoto: false })).toBe(
      'No encontré nada para «pastilla xyz». Probá con menos palabras o sacá el filtro de familia.',
    );
  });

  it('sin texto, habla de los filtros', () => {
    expect(emptyResultsMessage({ q: '', family: 'PF', withPhoto: true })).toBe(
      'No hay artículos con esos filtros.',
    );
  });
});
