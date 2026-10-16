import type { StoragePhoto } from '@/shared/lib/storage-photo';
import type { QueryLog } from './conversation';
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
  /** La foto en Supabase Storage (ADR-008); null si el artículo no tiene foto. */
  storagePhoto: StoragePhoto | null;
  hasPhoto: boolean;
}

export interface SearchSummary {
  total: number;
  approximate: boolean;
}

export interface Family {
  code: string;
  name: string | null;
}

export interface CounterPort {
  search(state: SearchState, offset: number, limit: number): Promise<Article[]>;
  /** Cuántos devuelve search() y si son lo más parecido en vez de lo pedido. */
  summary(state: SearchState): Promise<SearchSummary>;
  /** Solo las familias de producto (es_producto). */
  families(): Promise<Family[]>;
  /** Guarda el mensaje en las métricas. */
  record(log: QueryLog): Promise<void>;
}

/** Pasa un audio o una foto al texto a buscar. Falla con MediaError. */
export interface MediaPort {
  understand(kind: MediaKind, file: Blob): Promise<Understood>;
}
