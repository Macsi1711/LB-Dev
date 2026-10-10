import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { authErrorMessage } from '../domain/errors';
import { AuthLayout, FormError } from './auth-layout';
import { useAuth } from './auth-context';

export function ForgotPasswordPage() {
  const { port } = useAuth();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email'));
    const result = await port.requestPasswordReset(email, `${location.origin}/nueva-clave`);
    if (result.ok) setSent(true);
    else setError(authErrorMessage(result.code));
  }

  return (
    <AuthLayout
      title="Olvidé mi contraseña"
      description="Te mandamos un link para elegir una contraseña nueva."
    >
      {sent ? (
        <p className="text-sm">
          Si el email está registrado, en unos minutos te llega el link. Revisá también el spam.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
          </div>
          <FormError message={error} />
          <Button type="submit" size="lg">
            Mandar link
          </Button>
        </form>
      )}
      <Link to="/login" className="mt-4 block text-center text-sm text-muted-foreground underline">
        Volver a ingresar
      </Link>
    </AuthLayout>
  );
}
