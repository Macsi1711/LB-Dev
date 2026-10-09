export interface TelegramUser {
  chatId: number;
  name: string;
  active: boolean;
  notes: string | null;
  createdAt: string;
}

export type TelegramUserInput = Pick<TelegramUser, 'chatId' | 'name' | 'notes'>;

type Validation = { ok: true; value: TelegramUserInput } | { ok: false; error: string };

export function validateTelegramUser(form: {
  chatId: string;
  name: string;
  notes: string;
}): Validation {
  const chatId = form.chatId.trim();
  if (!/^-?\d{1,15}$/.test(chatId)) {
    return {
      ok: false,
      error: 'El chat_id tiene que ser un número, como aparece en Consultas recientes.',
    };
  }
  const name = form.name.trim();
  if (!name) return { ok: false, error: 'Poné un nombre para saber quién es.' };
  return { ok: true, value: { chatId: Number(chatId), name, notes: form.notes.trim() || null } };
}

/** Mensaje para un error de Postgres al guardar un usuario del bot. */
export function telegramUserErrorMessage(code: string | undefined): string {
  if (code === '23505') return 'Ese chat_id ya está habilitado.';
  return 'No se pudo guardar. Probá de nuevo.';
}
