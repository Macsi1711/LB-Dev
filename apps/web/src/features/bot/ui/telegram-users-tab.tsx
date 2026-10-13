import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth';
import { Button } from '@/shared/ui/button';
import { Switch } from '@/shared/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { canManageTelegramUsers, type TelegramUser } from '../domain/telegram-user';
import { useBotPort } from './bot-context';
import { DeleteTelegramUserDialog } from './delete-telegram-user-dialog';
import { TelegramUserDialog } from './telegram-user-dialog';

export function TelegramUsersTab() {
  const port = useBotPort();
  const { profile } = useAuth();
  const canManage = canManageTelegramUsers(profile?.role ?? 'vendedor');
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<{ user?: TelegramUser } | null>(null);
  const [toDelete, setToDelete] = useState<TelegramUser | null>(null);
  const users = useQuery({ queryKey: ['usuarios-telegram'], queryFn: () => port.telegramUsers() });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['usuarios-telegram'] });

  const toggle = useMutation({
    mutationFn: (u: TelegramUser) => port.updateTelegramUser(u.chatId, { active: !u.active }),
    onSuccess: refresh,
    onError: () => toast.error('No se pudo cambiar el estado.'),
  });

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {canManage ? (
          <>
            <p className="text-sm text-muted-foreground">
              Para saber el chat_id, que la persona le escriba al bot; va a aparecer en "Consultas
              recientes" como <em>no autorizado</em>.
            </p>
            <Button onClick={() => setDialog({})}>
              <Plus />
              Habilitar usuario
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Solo un admin puede habilitar, cambiar o sacar usuarios del bot.
          </p>
        )}
      </div>
      {users.isError && <p className="text-destructive">No se pudo cargar la lista.</p>}
      {users.isSuccess && users.data.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">
          Todavía no hay usuarios habilitados.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>chat_id</TableHead>
              <TableHead className="hidden md:table-cell">Notas</TableHead>
              <TableHead>Activo</TableHead>
              {canManage && <TableHead className="sr-only">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.data?.map((u) => (
              <TableRow key={u.chatId}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="font-mono text-xs">{u.chatId}</TableCell>
                <TableCell className="hidden whitespace-normal text-muted-foreground md:table-cell">
                  {u.notes}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={u.active}
                    disabled={!canManage}
                    onCheckedChange={() => toggle.mutate(u)}
                    aria-label={`Activo: ${u.name}`}
                  />
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDialog({ user: u })}
                      aria-label={`Editar ${u.name}`}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Borrar ${u.name}`}
                      onClick={() => setToDelete(u)}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {dialog && <TelegramUserDialog open user={dialog.user} onClose={() => setDialog(null)} />}
      {toDelete && <DeleteTelegramUserDialog user={toDelete} onClose={() => setToDelete(null)} />}
    </div>
  );
}
