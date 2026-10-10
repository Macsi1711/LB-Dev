import type { Role } from '@/shared/roles';

export type { Role };

export interface Profile {
  userId: string;
  name: string | null;
  role: Role;
}

export interface Session {
  userId: string;
  email: string | null;
}

/** Resultado de una operación de auth: ok, o el código de error de Supabase. */
export type AuthResult = { ok: true } | { ok: false; code: string | undefined };

export type AuthEvent = 'signed-in' | 'signed-out' | 'password-recovery';

export interface AuthPort {
  currentSession(): Promise<Session | null>;
  onChange(listener: (event: AuthEvent, session: Session | null) => void): () => void;
  signIn(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string, redirectTo: string): Promise<AuthResult>;
  updatePassword(password: string): Promise<AuthResult>;
  /** Perfil del usuario logueado; si no existe, la base lo crea como vendedor. */
  myProfile(): Promise<Profile>;
}
