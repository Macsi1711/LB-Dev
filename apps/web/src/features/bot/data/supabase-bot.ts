import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/database.types';
import { BotDataError, type BotPort } from '../domain/ports';

const fail = (error: PostgrestError): never => {
  throw new BotDataError(error.message, error.code);
};

export function createSupabaseBot(client: SupabaseClient<Database>): BotPort {
  const users = () => client.from('usuarios_telegram');
  return {
    async telegramUsers() {
      const { data, error } = await users().select('*').order('nombre');
      if (error) fail(error);
      return (data ?? []).map((u) => ({
        chatId: u.chat_id,
        name: u.nombre,
        active: u.activo,
        notes: u.notas,
        createdAt: u.created_at,
      }));
    },
    async createTelegramUser(u) {
      const { error } = await users().insert({ chat_id: u.chatId, nombre: u.name, notas: u.notes });
      if (error) fail(error);
    },
    async updateTelegramUser(chatId, patch) {
      const { error } = await users()
        .update({ nombre: patch.name, notas: patch.notes, activo: patch.active })
        .eq('chat_id', chatId);
      if (error) fail(error);
    },
    async deleteTelegramUser(chatId) {
      const { error } = await users().delete().eq('chat_id', chatId);
      if (error) fail(error);
    },
  };
}
