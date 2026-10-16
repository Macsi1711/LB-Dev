import type { MediaKind } from './media';
import type { SearchSummary } from './ports';
import type { SearchState } from './search-state';

/** Un mensaje del vendedor en el chat del Mostrador; la respuesta se calcula al mostrarlo. */
export interface ChatQuery {
  id: string;
  state: SearchState;
  /** Epoch en ms. */
  sentAt: number;
  /** Si vino de un audio o de una foto; sin esto, se escribió. */
  source?: MediaKind;
  /** Lo que se escuchó o se leyó. */
  heard?: string;
}

type QueryMeta = Pick<ChatQuery, 'id' | 'sentAt' | 'source' | 'heard'>;

export const MAX_HISTORY = 30;

const clean = (q: string) => q.trim().replace(/\s+/g, ' ');

/** Se manda con texto o con una familia elegida (para recorrer una familia entera). */
export function canSend(state: SearchState): boolean {
  return clean(state.q) !== '' || !!state.family;
}

const sameSearch = (a: SearchState, b: SearchState) =>
  clean(a.q).toLowerCase() === clean(b.q).toLowerCase() &&
  a.family === b.family &&
  a.withPhoto === b.withPhoto;

/**
 * Agrega la consulta al final y guarda las últimas MAX_HISTORY. No repite un texto igual al
 * último (pasa al recargar con el link); un audio o una foto se agregan siempre.
 */
export function sendQuery(history: ChatQuery[], state: SearchState, meta: QueryMeta): ChatQuery[] {
  const last = history.at(-1);
  if (!canSend(state)) return history;
  if (!meta.source && last && sameSearch(last.state, state)) return history;
  const next = [...history, { ...meta, state: { ...state, q: clean(state.q) } }];
  return next.slice(-MAX_HISTORY);
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function isChatQuery(v: unknown): v is ChatQuery {
  if (!isRecord(v) || typeof v.id !== 'string' || typeof v.sentAt !== 'number') return false;
  if (v.source !== undefined && v.source !== 'audio' && v.source !== 'photo') return false;
  if (v.heard !== undefined && typeof v.heard !== 'string') return false;
  const s = v.state;
  return (
    isRecord(s) &&
    typeof s.q === 'string' &&
    (s.family === null || typeof s.family === 'string') &&
    typeof s.withPhoto === 'boolean'
  );
}

/** Lo guardado en el navegador puede venir de otra versión: se queda solo lo que tiene forma. */
export function restoreHistory(raw: unknown): ChatQuery[] {
  return Array.isArray(raw) ? raw.filter(isChatQuery).slice(-MAX_HISTORY) : [];
}

const articles = (n: number) =>
  `${n.toLocaleString('es-AR')} ${n === 1 ? 'artículo' : 'artículos'}`;

/**
 * La primera línea de la respuesta del chat. `approximate`: no había nada con todas las palabras
 * y la búsqueda trajo lo más parecido.
 */
export function replySummary(
  total: number,
  state: SearchState,
  familyName?: string | null,
  approximate = false,
) {
  const q = clean(state.q);
  if (approximate && total > 0 && q) {
    return `No encontré «${q}» tal cual. Esto es lo más parecido (${articles(total)}):`;
  }
  if (total === 0) {
    if (!q) return 'No hay artículos con esos filtros.';
    const filtered = state.family || state.withPhoto;
    return `No encontré nada para «${q}». Probá con menos palabras${filtered ? ' o sacá los filtros' : ''}.`;
  }
  if (!q) return `Hay ${articles(total)} en ${familyName ?? state.family}.`;
  return `Encontré ${articles(total)} para «${q}».`;
}

/** Los filtros que acompañan al mensaje, para mostrarlos debajo del texto. */
export function filterLabels(state: SearchState, familyName?: string | null): string[] {
  const labels: string[] = [];
  if (state.family) labels.push(familyName ?? state.family);
  if (state.withPhoto) labels.push('Con foto');
  return labels;
}

/** Lo que se guarda en las métricas por cada mensaje (registrar_consulta en la base). */
export interface QueryLog {
  q: string | null;
  family: string | null;
  withPhoto: boolean;
  source: 'texto' | 'audio' | 'foto';
  heard: string | null;
  error: string | null;
  /** Cuántos encontró, si la web ya lo sabe; si no (null), la base vuelve a buscar para contar. */
  total: number | null;
  approximate: boolean | null;
}

const LOG_SOURCE = { audio: 'audio', photo: 'foto' } as const;

export function queryLog(query: ChatQuery, summary?: SearchSummary): QueryLog {
  return {
    q: query.state.q || null,
    family: query.state.family,
    withPhoto: query.state.withPhoto,
    source: query.source ? LOG_SOURCE[query.source] : 'texto',
    heard: query.heard ?? null,
    error: null,
    total: summary?.total ?? null,
    approximate: summary?.approximate ?? null,
  };
}

/** Un audio o una foto que no se pudieron pasar a texto también cuentan en las métricas. */
export function failedMediaLog(kind: MediaKind, state: SearchState, error: string): QueryLog {
  return {
    q: null,
    family: state.family,
    withPhoto: state.withPhoto,
    source: LOG_SOURCE[kind],
    heard: null,
    error,
    total: null,
    approximate: null,
  };
}
