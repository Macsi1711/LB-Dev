import { expect, it } from 'vitest';

// PR de prueba: falla a propósito para comprobar que la protección no deja mergear. Se cierra sin mergear.
it('la CI en rojo bloquea el merge', () => {
  expect(1 + 1).toBe(3);
});
