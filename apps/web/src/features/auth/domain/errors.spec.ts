import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './errors';

describe('authErrorMessage', () => {
  it.each([
    ['invalid_credentials', 'Email o contraseña incorrectos.'],
    ['email_not_confirmed', 'Todavía no confirmaste tu email. Revisá tu casilla.'],
    ['over_request_rate_limit', 'Demasiados intentos. Esperá un minuto y probá de nuevo.'],
    ['over_email_send_rate_limit', 'Demasiados intentos. Esperá un minuto y probá de nuevo.'],
    ['weak_password', 'La contraseña es muy débil: usá al menos 8 caracteres.'],
    ['same_password', 'La contraseña nueva tiene que ser distinta de la anterior.'],
    ['user_banned', 'Tu usuario está deshabilitado. Hablá con el administrador.'],
  ])('traduce %s', (code, mensaje) => {
    expect(authErrorMessage(code)).toBe(mensaje);
  });

  it('usa un mensaje genérico para errores desconocidos o sin código', () => {
    expect(authErrorMessage('algo_raro')).toBe('No se pudo completar. Probá de nuevo.');
    expect(authErrorMessage(undefined)).toBe('No se pudo completar. Probá de nuevo.');
  });
});
