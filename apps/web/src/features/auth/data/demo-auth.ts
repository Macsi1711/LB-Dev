import type { AuthEvent, AuthPort, Role, Session } from '../domain/ports';

/** Auth del modo demo: arranca como admin; cualquier email entra, y "vendedor…" entra como vendedor. */
export function createDemoAuth(): AuthPort {
  let role: Role = 'admin';
  let session: Session | null = { userId: 'demo-admin', email: 'admin@demo' };
  const listeners = new Set<(event: AuthEvent, session: Session | null) => void>();
  const emit = (event: AuthEvent) => listeners.forEach((l) => l(event, session));

  return {
    currentSession: async () => session,
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async signIn(email) {
      role = email.trim().toLowerCase().startsWith('vendedor') ? 'vendedor' : 'admin';
      session = { userId: `demo-${role}`, email };
      emit('signed-in');
      return { ok: true };
    },
    async signOut() {
      session = null;
      emit('signed-out');
    },
    updatePassword: async () => ({ ok: true }),
    myProfile: async () => ({
      userId: session?.userId ?? '',
      name: role === 'admin' ? 'Admin (demo)' : 'Vendedor (demo)',
      role,
    }),
  };
}
