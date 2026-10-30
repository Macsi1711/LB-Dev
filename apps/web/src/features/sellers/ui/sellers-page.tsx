import { useQuery } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { sellerLabel, type Seller } from '../domain/seller';
import { ResetPasswordDialog } from './reset-password-dialog';
import { useSellersPort } from './sellers-context';

const when = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' });

/** Sección Vendedores (solo admin): cambiarle la contraseña a quien se la olvidó (ADR-014). */
export function SellersPage() {
  const port = useSellersPort();
  const [toReset, setToReset] = useState<Seller | null>(null);
  const sellers = useQuery({ queryKey: ['vendedores'], queryFn: () => port.list() });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-3 sm:p-4">
      <h1 className="text-xl font-semibold">Vendedores</h1>
      <p className="max-w-xl rounded-md border bg-muted p-3 text-sm">
        Si un vendedor se olvidó la contraseña, ponele una nueva acá y pasásela. Las cuentas nuevas
        se crean en Supabase.
      </p>
      {sellers.isError && <p className="text-destructive">No se pudo cargar la lista.</p>}
      {sellers.isSuccess && sellers.data.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">Todavía no hay vendedores.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Último ingreso</TableHead>
              <TableHead className="sr-only">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sellers.data?.map((s) => (
              <TableRow key={s.userId}>
                <TableCell className="font-medium">{sellerLabel(s)}</TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {s.email}
                </TableCell>
                <TableCell className="hidden text-muted-foreground tabular-nums md:table-cell">
                  {s.lastSignIn ? when.format(new Date(s.lastSignIn)) : 'Nunca'}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => setToReset(s)}>
                    <KeyRound />
                    Cambiar contraseña
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {toReset && <ResetPasswordDialog seller={toReset} onClose={() => setToReset(null)} />}
    </div>
  );
}
