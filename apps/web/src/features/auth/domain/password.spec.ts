import { describe, expect, it } from 'vitest';
import { validateNewPassword } from './password';

describe('validateNewPassword', () => {
  it('acepta una contraseña de 8 o más caracteres que coincide con la confirmación', () => {
    expect(validateNewPassword('mostrador', 'mostrador')).toBeNull();
  });

  it('pide al menos 8 caracteres', () => {
    expect(validateNewPassword('corta', 'corta')).toBe('Usá al menos 8 caracteres.');
  });

  it('pide que las dos coincidan', () => {
    expect(validateNewPassword('mostrador', 'mostradoR')).toBe('Las contraseñas no coinciden.');
  });
});
