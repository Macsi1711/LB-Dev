import { describe, expect, it } from 'vitest';
import { coverageText, missingPhotosCsv } from './coverage';

describe('coverageText', () => {
  it('arma el texto del KPI con miles y porcentaje redondeado', () => {
    expect(coverageText({ total: 5678, withPhoto: 1234 })).toBe(
      '1.234 de 5.678 artículos con foto (22 %)',
    );
  });

  it('no divide por cero', () => {
    expect(coverageText({ total: 0, withPhoto: 0 })).toBe('0 de 0 artículos con foto (0 %)');
  });
});

describe('missingPhotosCsv', () => {
  it('genera código y nombre separados por ; con BOM para que Excel lea las tildes', () => {
    const csv = missingPhotosCsv([
      { code: '854001', name: 'PASTILLA FRENO TRAS. ONIX' },
      { code: 'BUJ-10', name: 'BUJÍA "IRIDIUM"; NGK' },
      { code: 'X1', name: null },
    ]);
    expect(csv).toBe(
      '\uFEFFcodigo;nombre\r\n854001;PASTILLA FRENO TRAS. ONIX\r\nBUJ-10;"BUJÍA ""IRIDIUM""; NGK"\r\nX1;\r\n',
    );
  });
});
