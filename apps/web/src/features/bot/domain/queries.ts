export type QuerySource = 'texto' | 'foto' | 'audio';

export type QueryChannel = 'web' | 'telegram';

export interface BotQuery {
  id: number;
  channel: QueryChannel;
  chatId: number | null;
  userName: string | null;
  source: QuerySource | null;
  text: string | null;
  sql: string | null;
  /** Lo que se escuchó o se leyó, en audios y fotos de la web. */
  heard: string | null;
  /** Filtros de la web. */
  family: string | null;
  withPhoto: boolean | null;
  /** La respuesta fue lo más parecido, no lo pedido. */
  approximate: boolean | null;
  /** 0 = sin resultados. */
  results: number | null;
  error: string | null;
  createdAt: string;
}

export const UNAUTHORIZED = 'no-autorizados';

export interface QueryFilters {
  onlyNoResults: boolean;
  channel: QueryChannel | null;
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

/** "sin resultados", "1 resultado", "1.500 resultados". */
export function resultsLabel(count: number): string {
  if (count === 0) return 'sin resultados';
  return `${count.toLocaleString('es-AR')} ${count === 1 ? 'resultado' : 'resultados'}`;
}

export const channelLabel = (channel: QueryChannel) => (channel === 'web' ? 'Web' : 'Telegram');

export function queryTags(q: Pick<BotQuery, 'family' | 'withPhoto' | 'approximate'>): string[] {
  const tags: string[] = [];
  if (q.family) tags.push(`Familia ${q.family}`);
  if (q.withPhoto) tags.push('Solo con foto');
  if (q.approximate) tags.push('Lo más parecido');
  return tags;
}
