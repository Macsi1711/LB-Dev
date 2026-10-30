/** Una cuenta de vendedor de la web. Las del admin no aparecen: su contraseña no se toca acá. */
export interface Seller {
  userId: string;
  name: string | null;
  email: string | null;
  /** ISO; null si nunca entró. */
  lastSignIn: string | null;
}

export const MIN_PASSWORD_LENGTH = 8;

export function sellerLabel(seller: Pick<Seller, 'name' | 'email'>): string {
  return seller.name?.trim() || seller.email || 'Sin nombre';
}

/** Devuelve el problema de la contraseña que pone el admin, o null si está bien. */
export function validateSellerPassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH)
    return `Usá al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (password !== password.trim()) return 'Sacale los espacios del principio y del final.';
  return null;
}

const MESSAGES: Record<string, string> = {
  '22023': `Usá al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
  P0002: 'Ese vendedor ya no existe. Recargá la página.',
  '42501': 'Solo un admin puede cambiar contraseñas.',
};

/** Mensaje para un error de Postgres de cambiar_clave_vendedor(). */
export function resetPasswordErrorMessage(code: string | undefined): string {
  return (code && MESSAGES[code]) || 'No se pudo cambiar. Probá de nuevo.';
}
