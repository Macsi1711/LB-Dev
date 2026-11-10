import { describe, expect, it } from 'vitest';
import { resetPasswordErrorMessage, sellerLabel, validateSellerPassword } from './seller';

describe('sellerLabel', () => {
  it('usa el nombre y, si no tiene, el email', () => {
    expect(sellerLabel({ name: 'Juan', email: 'juan@lois.com' })).toBe('Juan');
    expect(sellerLabel({ name: null, email: 'juan@lois.com' })).toBe('juan@lois.com');
    expect(sellerLabel({ name: '  ', email: null })).toBe('Sin nombre');
  });
});

describe('validateSellerPassword', () => {
  it('pide al menos 8 caracteres, como la base', () => {
    expect(validateSellerPassword('corta')).toBe('Usá al menos 8 caracteres.');
    expect(validateSellerPassword('mostrador-2026')).toBeNull();
  });

  it('no acepta espacios al principio o al final: al dictarla se pierden', () => {
    expect(validateSellerPassword(' mostrador ')).toBe(
      'Sacale los espacios del principio y del final.',
    );
  });
});

describe('resetPasswordErrorMessage', () => {
  it('traduce los códigos de Postgres', () => {
    expect(resetPasswordErrorMessage('22023')).toBe('Usá al menos 8 caracteres.');
    expect(resetPasswordErrorMessage('P0002')).toBe(
      'Ese vendedor ya no existe. Recargá la página.',
    );
    expect(resetPasswordErrorMessage('42501')).toBe('Solo un admin puede cambiar contraseñas.');
    expect(resetPasswordErrorMessage(undefined)).toBe('No se pudo cambiar. Probá de nuevo.');
  });
});
