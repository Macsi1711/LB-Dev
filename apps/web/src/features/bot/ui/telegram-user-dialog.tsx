import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { BotDataError } from '../domain/ports';
import {
  telegramUserErrorMessage,
  validateTelegramUser,
  type TelegramUser,
} from '../domain/telegram-user';
import { useBotPort } from './bot-context';

/** Alta (sin `user`) o edición de un usuario habilitado. */
export function TelegramUserDialog(props: {
  open: boolean;
  user?: TelegramUser;
  onClose: () => void;
}) {
  const port = useBotPort();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const editing = !!props.user;

  const save = useMutation({
    mutationFn: async (form: FormData) => {
      const result = validateTelegramUser({
        chatId: String(form.get('chatId') ?? props.user?.chatId ?? ''),
        name: String(form.get('name')),
        notes: String(form.get('notes')),
      });
      if (!result.ok) throw new Error(result.error);
      if (editing) await port.updateTelegramUser(result.value.chatId, result.value);
      else await port.createTelegramUser(result.value);
    },
    onSuccess: async () => {
      toast.success(editing ? 'Cambios guardados' : 'Usuario habilitado');
      await queryClient.invalidateQueries({ queryKey: ['usuarios-telegram'] });
      props.onClose();
    },
    onError: (e) =>
      setError(e instanceof BotDataError ? telegramUserErrorMessage(e.code) : e.message),
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    save.mutate(new FormData(e.currentTarget));
  }

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar usuario' : 'Habilitar usuario'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="chatId">chat_id</Label>
            <Input
              id="chatId"
              name="chatId"
              inputMode="numeric"
              className="font-mono"
              defaultValue={props.user?.chatId}
              disabled={editing}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" defaultValue={props.user?.name} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notas</Label>
            <Input id="notes" name="notes" defaultValue={props.user?.notes ?? ''} />
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
