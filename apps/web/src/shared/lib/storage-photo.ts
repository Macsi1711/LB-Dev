import type { SupabaseClient } from '@supabase/supabase-js';

/** Links públicos de la foto de un artículo en Supabase Storage (ADR-008). */
export interface StoragePhoto {
  /** Lado mayor 800 px. */
  full: string;
  /** Miniatura para tarjetas y listas. */
  mini: string;
}

export const PHOTOS_BUCKET = 'fotos';

/** La miniatura vive al lado de la foto: `12/AbCd.jpg` → `12/AbCd.mini.jpg`. */
export function storagePaths(path: string): { full: string; mini: string } {
  return { full: path, mini: path.replace(/\.jpg$/, '.mini.jpg') };
}

/** Links públicos de `articulos.foto` (o null si el artículo todavía no tiene foto en Storage). */
export function storagePhoto(client: SupabaseClient, path: string | null): StoragePhoto | null {
  if (!path) return null;
  const bucket = client.storage.from(PHOTOS_BUCKET);
  const { full, mini } = storagePaths(path);
  return {
    full: bucket.getPublicUrl(full).data.publicUrl,
    mini: bucket.getPublicUrl(mini).data.publicUrl,
  };
}
