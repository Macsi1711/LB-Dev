import type { AuthError, SupabaseClient, Session as SupabaseSession } from '@supabase/supabase-js';
import type { Database } from '@/shared/database.types';
import type { AuthPort, AuthResult, Session } from '../domain/ports';

const toSession = (s: SupabaseSession | null): Session | null =>
  s ? { userId: s.user.id, email: s.user.email ?? null } : null;

const toResult = (error: AuthError | null): AuthResult =>
  error ? { ok: false, code: error.code } : { ok: true };

export function createSupabaseAuth(client: SupabaseClient<Database>): AuthPort {
  return {
    async currentSession() {
      const { data } = await client.auth.getSession();
      return toSession(data.session);
    },
    onChange(listener) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') listener('signed-out', null);
        else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')
          listener('signed-in', toSession(session));
      });
      return () => data.subscription.unsubscribe();
    },
    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email, password });
      return toResult(error);
    },
    async signOut() {
      await client.auth.signOut();
    },
    async updatePassword(password) {
      const { error } = await client.auth.updateUser({ password });
      return toResult(error);
    },
    async myProfile() {
      const { data, error } = await client.rpc('mi_perfil');
      if (error) throw error;
      return {
        userId: data.user_id,
        name: data.nombre,
        role: data.rol === 'admin' ? 'admin' : 'vendedor',
      };
    },
  };
}
