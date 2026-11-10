import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { isDemo } from '@/shared/lib/demo';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { authErrorMessage } from '../domain/errors';
import { AuthLayout, FormError } from './auth-layout';
import { useAuth } from './auth-context';

export function LoginPage() {
  const { port, session } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (session) return <Navigate to={from} replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSending(true);
    const result = await port.signIn(String(form.get('email')), String(form.get('password')));
    setSending(false);
    if (result.ok) navigate(from, { replace: true });
    else setError(authErrorMessage(result.code));
  }

  return (
    <AuthLayout
      title="Ingresar"
      description={
        isDemo
          ? 'Demo: entrá con cualquier email y contraseña. Si el email empieza con "vendedor", ves la vista de vendedor.'
          : undefined
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <FormError message={error} />
        <Button type="submit" size="lg" disabled={sending}>
          {sending ? 'Ingresando…' : 'Ingresar'}
        </Button>
        {/* Sin mail de recuperación: la contraseña olvidada la cambia un admin (ADR-014). */}
        <p className="text-center text-sm text-muted-foreground">
          ¿Te olvidaste la contraseña? Pedile a un encargado que te ponga una nueva.
        </p>
      </form>
    </AuthLayout>
  );
}
