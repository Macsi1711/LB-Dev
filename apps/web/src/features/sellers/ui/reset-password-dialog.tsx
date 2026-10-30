import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { SellersDataError } from '../domain/ports';
import {
  MIN_PASSWORD_LENGTH,
  resetPasswordErrorMessage,
  sellerLabel,
  validateSellerPassword,
  type Seller,
} from '../domain/seller';
import { useSellersPort } from './sellers-context';

export function ResetPasswordDialog({ seller, onClose }: { seller: Seller; onClose: () => void }) {
  const port = useSellersPort();
  const [error, setError] = useState<string | null>(null);
  const name = sellerLabel(seller);

  const save = useMutation({
    mutationFn: async (password: string) => {
      const problem = validateSellerPassword(password);
      if (problem) throw new Error(problem);
      await port.resetPassword(seller.userId, password);
    },
    onSuccess: () => {
      toast.success(`Listo. ${name} ya entra con la contraseña nueva.`);
      onClose();
    },
    onError: (e) =>
      setError(e instanceof SellersDataError ? resetPasswordErrorMessage(e.code) : e.message),
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    save.mutate(String(new FormData(e.currentTarget).get('password')));
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar la contraseña de {name}</DialogTitle>
          <DialogDescription>
            Pasásela a {name}: entra con esta y después la cambia por una propia con el ícono de la
            llave.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña nueva</Label>
            {/* Se ve mientras se escribe: el admin se la tiene que pasar al vendedor. */}
            <Input
              id="password"
              name="password"
              type="text"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Al menos {MIN_PASSWORD_LENGTH} caracteres.
            </p>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
