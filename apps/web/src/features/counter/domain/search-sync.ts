export interface SearchSyncInput {
  /** q de la URL. */
  url: string;
  /** Último valor en el que coincidieron el buscador y la URL. */
  synced: string;
  /** Lo que hay escrito en el buscador ahora. */
  text: string;
  /** El texto con debounce (deja de cambiar 250 ms después de escribir). */
  debounced: string;
}

export interface SearchSyncResult {
  synced: string;
  /** Escribir este texto en la URL. */
  writeUrl?: string;
  /** Poner este texto en el buscador. */
  setText?: string;
}

const same = (a: string, b: string) => a.trim() === b.trim();

/** Decide quién manda: la URL si cambió desde afuera; si no, el texto cuando terminó de escribirse. */
export function syncSearchText({
  url,
  synced,
  text,
  debounced,
}: SearchSyncInput): SearchSyncResult {
  if (!same(url, synced)) return { setText: url, synced: url };
  if (debounced === text && !same(debounced, synced))
    return { writeUrl: debounced, synced: debounced.trim() };
  return { synced };
}
