import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/features/auth';
import { canAccess } from '../domain/navigation';

/** Si el rol no puede entrar a esta sección, vuelve al Mostrador. */
export function RequireRole() {
  const { profile } = useAuth();
  const { pathname } = useLocation();
  if (!profile || !canAccess(profile.role, pathname)) return <Navigate to="/" replace />;
  return <Outlet />;
}
