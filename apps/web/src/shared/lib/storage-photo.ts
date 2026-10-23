import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/database.types';
import { photoPath, photoToken, UploadError, uploadErrorReason } from './photo-upload';

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

/** El código HTTP de un error de Storage (supabase-js lo trae como `status` o `statusCode`). */
function statusOf(error: object): number | undefined {
  const { status, statusCode } = error as { status?: unknown; statusCode?: unknown };
  const value = Number(status ?? statusCode);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Sube la foto de un artículo (grande y miniatura, JPEG) a Supabase Storage y se la asigna
 * (rpc asignar_foto_subida). La usan "Agregar foto" y el alta de productos. Falla con UploadError.
 */
export async function uploadArticlePhoto(
  client: SupabaseClient<Database>,
  articleId: number,
  photo: { full: Blob; mini: Blob },
): Promise<void> {
  const path = photoPath(articleId, photoToken(crypto.getRandomValues(new Uint8Array(12))));
  const { full, mini } = storagePaths(path);
  const bucket = client.storage.from(PHOTOS_BUCKET);
  const options = { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false };
  for (const [file, blob] of [
    [full, photo.full],
    [mini, photo.mini],
  ] as const) {
    const { error } = await bucket.upload(file, blob, options);
    if (error) throw new UploadError(uploadErrorReason(statusOf(error)));
  }
  const { error } = await client.rpc('asignar_foto_subida', {
    p_articulo_id: articleId,
    p_ruta: full,
  });
  if (error) throw new UploadError(error.code === '42501' ? 'unauthorized' : 'failed');
}
