import type { StoragePhoto } from '@/shared/lib/storage-photo';
import { driveViewUrl, thumbnailCandidates } from './drive';

/** Hasta este ancho alcanza la miniatura; más grande, la foto entera. */
const MINI_UP_TO = 400;

/**
 * URLs a probar en orden: primero Storage y, si el artículo todavía no está ahí o falla, Drive
 * como hasta ahora (ADR-008: Drive queda de respaldo hasta que se apague).
 */
export function photoCandidates(
  storage: StoragePhoto | null,
  driveId: string | null,
  width = MINI_UP_TO,
): string[] {
  const fromStorage = storage
    ? width <= MINI_UP_TO
      ? [storage.mini, storage.full]
      : [storage.full]
    : [];
  return [...fromStorage, ...(driveId ? thumbnailCandidates(driveId, width) : [])];
}

/** Link para "Abrir foto": la grande de Storage o, si no hay, la de Drive. */
export function photoLink(storage: StoragePhoto | null, driveId: string | null): string | null {
  if (storage) return storage.full;
  return driveId ? driveViewUrl(driveId) : null;
}
