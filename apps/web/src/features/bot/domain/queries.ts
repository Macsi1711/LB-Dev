export type QuerySource = 'texto' | 'foto' | 'audio';

export interface BotQuery {
  id: number;
  chatId: number | null;
  userName: string | null;
  source: QuerySource | null;
  text: string | null;
  sql: string | null;
  /** 0 = sin resultados. */
  results: number | null;
  error: string | null;
  createdAt: string;
}

export const UNAUTHORIZED = 'no-autorizados';

export interface QueryFilters {
  onlyNoResults: boolean;
  /** chat_id de un usuario, o UNAUTHORIZED para los que no están en la lista blanca. */
  user: number | typeof UNAUTHORIZED | null;
  source: QuerySource | null;
  /** Fechas YYYY-MM-DD, inclusive. */
  from: string | null;
  to: string | null;
}

const AR_OFFSET = '-03:00'; // Argentina no tiene horario de verano

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function dateRange(from: string | null, to: string | null): { gte?: string; lt?: string } {
  return {
    ...(from && { gte: `${from}T00:00:00${AR_OFFSET}` }),
    ...(to && { lt: `${nextDay(to)}T00:00:00${AR_OFFSET}` }),
  };
}

export function userLabel(query: Pick<BotQuery, 'userName'>): string {
  return query.userName ?? 'no autorizado';
}
