import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/database.types';
import { BotDataError, type BotPort } from '../domain/ports';
import { dateRange, UNAUTHORIZED, type QuerySource } from '../domain/queries';

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
    async recentQueries(filters, offset, limit) {
      let query = client
        .from('v_consultas_bot')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (filters.onlyNoResults) query = query.eq('cantidad', 0);
      if (filters.user === UNAUTHORIZED) query = query.is('usuario_nombre', null);
      else if (filters.user !== null) query = query.eq('chat_id', filters.user);
      if (filters.source) query = query.eq('fuente', filters.source);
      const range = dateRange(filters.from, filters.to);
      if (range.gte) query = query.gte('created_at', range.gte);
      if (range.lt) query = query.lt('created_at', range.lt);
      const { data, error } = await query;
      if (error) fail(error);
      return (data ?? []).map((q) => ({
        id: q.id ?? 0,
        chatId: q.chat_id,
        userName: q.usuario_nombre,
        source: q.fuente as QuerySource | null,
        text: q.texto,
        sql: q.sql_generado,
        results: q.cantidad,
        error: q.error,
        createdAt: q.created_at ?? '',
      }));
    },
  };
}
