import { describe, expect, it } from 'vitest';
import { fitWithin } from './shrink-photo';

describe('fitWithin', () => {
  it('achica el lado más largo al máximo, manteniendo la proporción', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(1200, 3000, 1600)).toEqual({ width: 640, height: 1600 });
  });

  it('una foto chica no se agranda', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});
