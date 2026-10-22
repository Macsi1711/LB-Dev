import { describe, expect, it } from 'vitest';
import { canManagePhotos } from './access';

describe('canManagePhotos', () => {
  it('cargar fotos y ver las que faltan es del admin; los demás ven solo el contador (ADR-011)', () => {
    expect(canManagePhotos('admin')).toBe(true);
    expect(canManagePhotos('vendedor')).toBe(false);
    expect(canManagePhotos('anonimo')).toBe(false);
    expect(canManagePhotos(undefined)).toBe(false);
  });
});
