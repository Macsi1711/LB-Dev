import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { authErrorMessage } from '../domain/errors';
import { validateNewPassword } from '../domain/password';
import { AuthLayout, FormError } from './auth-layout';
import { useAuth } from './auth-context';

export function NewPasswordPage() {
  const { port, session } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  if (session === undefined) return null;
  if (!session) {
    return (
      <AuthLayout title="El link venció" description="El link ya se usó o pasó demasiado tiempo.">
        <Link to="/recuperar" className="text-sm underline">
          Pedí uno nuevo
        </Link>
      </AuthLayout>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get('password'));
    const problem = validateNewPassword(password, String(form.get('confirmation')));
    if (problem) return setError(problem);
    const result = await port.updatePassword(password);
    if (!result.ok) return setError(authErrorMessage(result.code));
    toast.success('Listo, ya podés usar la contraseña nueva.');
    navigate('/', { replace: true });
  }

  return (
    <AuthLayout title="Contraseña nueva">
      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="password">Contraseña nueva</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            autoFocus
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirmation">Repetila</Label>
          <Input
            id="confirmation"
            name="confirmation"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
        <FormError message={error} />
        <Button type="submit" size="lg">
          Guardar
        </Button>
      </form>
    </AuthLayout>
  );
}
