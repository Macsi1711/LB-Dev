import type { Viewer } from '@/shared/roles';
import type { Profile, Session } from './ports';

/**
 * Quién está usando la web. `session` es undefined mientras se lee la sesión guardada; con
 * sesión, hasta que llega el perfil todavía no se sabe (undefined).
 */
export function viewerOf(
  session: Session | null | undefined,
  profile: Profile | undefined,
): Viewer | undefined {
  if (session === null) return 'anonimo';
  return session && profile ? profile.role : undefined;
}
