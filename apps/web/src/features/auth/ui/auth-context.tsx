import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Viewer } from '@/shared/roles';
import type { AuthPort, Profile, Session } from '../domain/ports';
import { viewerOf } from '../domain/viewer';

interface AuthState {
  port: AuthPort;
  /** undefined mientras se lee la sesión guardada. */
  session: Session | null | undefined;
  profile: Profile | undefined;
  profileError: Error | null;
  /** Quién usa la web: 'anonimo' sin sesión (ADR-010); undefined mientras no se sabe. */
  viewer: Viewer | undefined;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ port, children }: { port: AuthPort; children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const queryClient = useQueryClient();

  useEffect(() => {
    void port.currentSession().then(setSession);
    return port.onChange((event, next) => {
      setSession(next);
      if (event === 'signed-out') queryClient.clear();
    });
  }, [port, queryClient]);

  const profileQuery = useQuery({
    queryKey: ['perfil', session?.userId],
    queryFn: () => port.myProfile(),
    enabled: !!session,
    staleTime: Infinity,
  });

  const value = useMemo<AuthState>(
    () => ({
      port,
      session,
      profile: profileQuery.data,
      profileError: profileQuery.error,
      viewer: viewerOf(session, profileQuery.data),
    }),
    [port, session, profileQuery.data, profileQuery.error],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const state = useContext(AuthContext);
  if (!state) throw new Error('useAuth se usa dentro de <AuthModule>');
  return state;
}
