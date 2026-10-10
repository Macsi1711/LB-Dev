import { describe, expect, it } from 'vitest';
import { formatPercent } from './kpis';

describe('formatPercent', () => {
  it('redondea y usa el formato argentino', () => {
    expect(formatPercent(66.7)).toBe('67 %');
    expect(formatPercent(0)).toBe('0 %');
  });

  it('muestra una raya si no hay datos', () => {
    expect(formatPercent(null)).toBe('—');
  });
});
