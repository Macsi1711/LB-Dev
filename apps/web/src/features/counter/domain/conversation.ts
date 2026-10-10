import type { SearchState } from './search-state';

/** Un mensaje del vendedor en el chat del Mostrador; la respuesta se calcula al mostrarlo. */
export interface ChatQuery {
  id: string;
  state: SearchState;
  /** Epoch en ms. */
  sentAt: number;
}

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

/** Agrega la consulta al final, sin repetir la última y guardando las últimas MAX_HISTORY. */
export function sendQuery(
  history: ChatQuery[],
  state: SearchState,
  meta: { id: string; sentAt: number },
): ChatQuery[] {
  const last = history.at(-1);
  if (!canSend(state) || (last && sameSearch(last.state, state))) return history;
  const next = [...history, { ...meta, state: { ...state, q: clean(state.q) } }];
  return next.slice(-MAX_HISTORY);
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function isChatQuery(v: unknown): v is ChatQuery {
  if (!isRecord(v) || typeof v.id !== 'string' || typeof v.sentAt !== 'number') return false;
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

/** La primera línea de la respuesta del chat. */
export function replySummary(total: number, state: SearchState, familyName?: string | null) {
  const q = clean(state.q);
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
