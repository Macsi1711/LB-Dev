import { describe, expect, it } from 'vitest';
import { dateRange, resultsLabel, userLabel } from './queries';

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
  it('muestra "no autorizado" si el chat no está en la lista blanca', () => {
    expect(userLabel({ userName: 'Juan' })).toBe('Juan');
    expect(userLabel({ userName: null })).toBe('no autorizado');
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
