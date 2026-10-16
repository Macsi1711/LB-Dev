import type { StoragePhoto } from '@/shared/lib/storage-photo';

/** Hasta este ancho alcanza la miniatura; más grande, la foto entera. */
const MINI_UP_TO = 400;

/** URLs a probar en orden. Las fotos están solo en Supabase Storage: Drive ya no se usa (ADR-008). */
export function photoCandidates(storage: StoragePhoto | null, width = MINI_UP_TO): string[] {
  if (!storage) return [];
  return width <= MINI_UP_TO ? [storage.mini, storage.full] : [storage.full];
}

/** Link para "Abrir foto": la foto grande. */
export const photoLink = (storage: StoragePhoto | null): string | null => storage?.full ?? null;
