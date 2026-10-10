export interface SearchState {
  q: string;
  family: string | null;
  withPhoto: boolean;
}

export const PAGE_SIZE = 40;

/** La búsqueda vive en la URL (?q=&familia=&foto=) para poder compartir el link. */
export function parseSearchState(params: URLSearchParams): SearchState {
  return {
    q: params.get('q') ?? '',
    family: params.get('familia') || null,
    withPhoto: params.get('foto') === '1',
  };
}

export function toSearchParams(state: SearchState): URLSearchParams {
  const params = new URLSearchParams();
  const q = state.q.trim();
  if (q) params.set('q', q);
  if (state.family) params.set('familia', state.family);
  if (state.withPhoto) params.set('foto', '1');
  return params;
}
