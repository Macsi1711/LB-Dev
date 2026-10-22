import { describe, expect, it } from 'vitest';
import { channelLabel, dateRange, queryTags, resultsLabel, userLabel } from './queries';

describe('dateRange', () => {
  it('convierte las fechas del filtro a un rango en hora argentina, con el "hasta" inclusive', () => {
    expect(dateRange('2026-10-01', '2026-10-09')).toEqual({
      gte: '2026-10-01T00:00:00-03:00',
      lt: '2026-10-10T00:00:00-03:00',
    });
  });

  it('pasa de mes y de año', () => {
    expect(dateRange(null, '2026-12-31')).toEqual({ lt: '2027-01-01T00:00:00-03:00' });
    expect(dateRange(null, '2026-02-28').lt).toBe('2026-03-01T00:00:00-03:00');
  });

  it('sin fechas no filtra', () => {
    expect(dateRange(null, null)).toEqual({});
  });
});

describe('userLabel', () => {
  it('muestra "no autorizado" si el chat de Telegram no está en la lista blanca', () => {
    expect(userLabel({ userName: 'Juan', channel: 'telegram' })).toBe('Juan');
    expect(userLabel({ userName: null, channel: 'telegram' })).toBe('no autorizado');
  });

  it('en la web, sin usuario es una búsqueda sin sesión (ADR-010)', () => {
    expect(userLabel({ userName: 'Ana', channel: 'web' })).toBe('Ana');
    expect(userLabel({ userName: null, channel: 'web' })).toBe('sin sesión');
  });
});

describe('resultsLabel', () => {
  it('usa singular, plural y "sin resultados"', () => {
    expect(resultsLabel(0)).toBe('sin resultados');
    expect(resultsLabel(1)).toBe('1 resultado');
    expect(resultsLabel(2)).toBe('2 resultados');
    expect(resultsLabel(1500)).toBe('1.500 resultados');
  });
});

describe('channelLabel', () => {
  it('dice por dónde llegó la consulta', () => {
    expect(channelLabel('web')).toBe('Web');
    expect(channelLabel('telegram')).toBe('Telegram');
  });
});

describe('queryTags', () => {
  it('lista los filtros de la consulta y si la respuesta fue lo más parecido', () => {
    expect(queryTags({ family: 'PF', withPhoto: true, approximate: true })).toEqual([
      'Familia PF',
      'Solo con foto',
      'Lo más parecido',
    ]);
    expect(queryTags({ family: null, withPhoto: null, approximate: null })).toEqual([]);
  });
});
