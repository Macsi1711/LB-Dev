import type { MediaKind, Understood } from './media';
import type { SearchState } from './search-state';

export interface Article {
  id: number;
  code: string;
  name: string | null;
  description: string | null;
  notes: string | null;
  familyCode: string | null;
  familyName: string | null;
  photoUrl: string | null;
  driveId: string | null;
  hasPhoto: boolean;
}

export interface Family {
  code: string;
  name: string | null;
}

export interface CounterPort {
  search(state: SearchState, offset: number, limit: number): Promise<Article[]>;
  count(state: SearchState): Promise<number>;
  /** Solo las familias de producto (es_producto). */
  families(): Promise<Family[]>;
}

/** Pasa un audio o una foto al texto a buscar. Falla con MediaError. */
export interface MediaPort {
  understand(kind: MediaKind, file: Blob): Promise<Understood>;
}
