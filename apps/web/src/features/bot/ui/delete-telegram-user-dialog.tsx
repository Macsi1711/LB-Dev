import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import type { TelegramUser } from '../domain/telegram-user';
import { useBotPort } from './bot-context';

/**
 * Confirmación propia para sacar a un usuario del bot. No usa window.confirm(): algunos
 * navegadores embebidos (como el visor del demo publicado) lo bloquean y devuelve false.
 */
export function DeleteTelegramUserDialog(props: { user: TelegramUser; onClose: () => void }) {
  const port = useBotPort();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => port.deleteTelegramUser(props.user.chatId),
    onSuccess: async () => {
      toast.success(`${props.user.name} ya no puede usar el bot`);
      await queryClient.invalidateQueries({ queryKey: ['usuarios-telegram'] });
      props.onClose();
    },
    onError: () => toast.error('No se pudo borrar. Probá de nuevo.'),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && !remove.isPending && props.onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Borrar a {props.user.name}?</DialogTitle>
          <DialogDescription>
            Ya no va a poder usar el bot. Si solo querés pausarlo, apagá el switch "Activo".
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={props.onClose} disabled={remove.isPending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={() => remove.mutate()} disabled={remove.isPending}>
            {remove.isPending ? 'Borrando…' : 'Borrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
