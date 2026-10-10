export const MIN_PASSWORD_LENGTH = 8;

/** Devuelve el problema de la contraseña nueva, o null si está bien. */
export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH)
    return `Usá al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (password !== confirmation) return 'Las contraseñas no coinciden.';
  return null;
}
