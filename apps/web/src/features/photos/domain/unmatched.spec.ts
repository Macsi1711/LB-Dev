import { describe, expect, it } from 'vitest';
import { candidateList, suggestionTexts } from './unmatched';

describe('candidateList', () => {
  it('separa los candidatos que arma n8n con |', () => {
    expect(candidateList('854000| 854000 COPIA |')).toEqual(['854000', '854000 COPIA']);
    expect(candidateList(null)).toEqual([]);
  });
});

describe('suggestionTexts', () => {
  it('usa el nombre del archivo y los candidatos, sin repetir', () => {
    expect(
      suggestionTexts({ file: '854000 copia.jpg', candidates: '854000 COPIA|854000' }),
    ).toEqual(['854000 copia.jpg', '854000 COPIA', '854000']);
  });

  it('funciona sin nombre de archivo', () => {
    expect(suggestionTexts({ file: null, candidates: 'ONIX' })).toEqual(['ONIX']);
  });
});
