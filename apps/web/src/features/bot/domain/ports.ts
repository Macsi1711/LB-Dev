import type { BotQuery, QueryFilters } from './queries';
import type { TelegramUser, TelegramUserInput } from './telegram-user';

export interface BotPort {
  telegramUsers(): Promise<TelegramUser[]>;
  createTelegramUser(user: TelegramUserInput): Promise<void>;
  updateTelegramUser(
    chatId: number,
    patch: Partial<TelegramUserInput & { active: boolean }>,
  ): Promise<void>;
  deleteTelegramUser(chatId: number): Promise<void>;
  recentQueries(filters: QueryFilters, offset: number, limit: number): Promise<BotQuery[]>;
}

/** Error de la base con el código de Postgres, para elegir el mensaje. */
export class BotDataError extends Error {
  constructor(
    message: string,
    readonly code: string | undefined,
  ) {
    super(message);
  }
}
