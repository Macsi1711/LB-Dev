import { describe, expect, it } from 'vitest';
import { FREE_STORAGE_BYTES, storageUsage } from './storage-usage';

const MB = 1_000_000;

describe('storageUsage', () => {
  it('arma el texto con MB, el límite y el porcentaje', () => {
    expect(storageUsage({ bytes: 62_400_000, photos: 442 }).text).toBe(
      '62 MB de 1 GB usados (6 %)',
    );
  });

  it('pasa a GB con un decimal desde 1 GB', () => {
    expect(storageUsage({ bytes: 1_250_000_000, photos: 9000 }, 2_000_000_000).text).toBe(
      '1,3 GB de 2 GB usados (63 %)',
    );
  });

  it('estima cuántas fotos más entran con el promedio de las que hay', () => {
    // 100 fotos en 10 MB: 100 KB cada una; quedan 990 MB → 9.900 fotos.
    expect(storageUsage({ bytes: 10 * MB, photos: 100 }).remainingPhotos).toBe(9900);
  });

  it('sin fotos no estima', () => {
    expect(storageUsage({ bytes: 0, photos: 0 })).toMatchObject({
      percent: 0,
      level: 'ok',
      remainingPhotos: null,
    });
  });

  it('avisa desde el 70 % y alerta desde el 85 %', () => {
    const level = (pct: number) =>
      storageUsage({ bytes: (FREE_STORAGE_BYTES * pct) / 100, photos: 1 }).level;
    expect(level(69.9)).toBe('ok');
    expect(level(70)).toBe('warning');
    expect(level(84.9)).toBe('warning');
    expect(level(85)).toBe('critical');
    expect(level(120)).toBe('critical');
  });

  it('pasado el límite no estima fotos negativas', () => {
    expect(storageUsage({ bytes: 1_100_000_000, photos: 5000 }).remainingPhotos).toBe(0);
  });
});
