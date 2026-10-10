const GENERIC = 'No se pudo completar. Probá de nuevo.';
const RATE_LIMIT = 'Demasiados intentos. Esperá un minuto y probá de nuevo.';

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email o contraseña incorrectos.',
  email_not_confirmed: 'Todavía no confirmaste tu email. Revisá tu casilla.',
  over_request_rate_limit: RATE_LIMIT,
  over_email_send_rate_limit: RATE_LIMIT,
  weak_password: 'La contraseña es muy débil: usá al menos 8 caracteres.',
  same_password: 'La contraseña nueva tiene que ser distinta de la anterior.',
  user_banned: 'Tu usuario está deshabilitado. Hablá con el administrador.',
};

/** Traduce el código de error de Supabase Auth a un mensaje para el usuario. */
export function authErrorMessage(code: string | undefined): string {
  return (code && MESSAGES[code]) || GENERIC;
}
