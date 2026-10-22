import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/features/auth';
import { canAccess } from '../domain/navigation';

/** Si quien mira no puede entrar a esta sección, vuelve al Mostrador. Va dentro de RequireAuth. */
export function RequireRole() {
  const { viewer } = useAuth();
  const { pathname } = useLocation();
  if (!viewer || !canAccess(viewer, pathname)) return <Navigate to="/" replace />;
  return <Outlet />;
}
