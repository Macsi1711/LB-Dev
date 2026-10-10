import { Navigate, Outlet, useLocation } from 'react-router';
import { Button } from '@/shared/ui/button';
import { useAuth } from './auth-context';

/** Deja pasar solo con sesión y perfil cargado. Sin sesión, manda al login. */
export function RequireAuth() {
  const { session, profile, profileError } = useAuth();
  const location = useLocation();

  if (session === null) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (profileError) {
    return (
      <main className="grid min-h-dvh place-content-center gap-3 p-4 text-center">
        <p>No pudimos cargar tu perfil.</p>
        <Button onClick={() => window.location.reload()}>Reintentar</Button>
      </main>
    );
  }
  if (!session || !profile) {
    return <p className="p-4 text-muted-foreground">Cargando…</p>;
  }
  return <Outlet />;
}
