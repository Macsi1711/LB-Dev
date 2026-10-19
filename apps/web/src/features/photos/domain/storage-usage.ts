/** Espacio de archivos del plan gratis de Supabase (ADR-008). */
export const FREE_STORAGE_BYTES = 1_000_000_000;

const WARNING_AT = 0.7;
const CRITICAL_AT = 0.85;

export type UsageLevel = 'ok' | 'warning' | 'critical';

export interface StorageUsage {
  /** Lo que ocupan todos los archivos de Storage (fotos y miniaturas). */
  bytes: number;
  /** Artículos con foto. */
  photos: number;
}

const integer = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

const size = (bytes: number) =>
  bytes >= 1e9 ? `${oneDecimal.format(bytes / 1e9)} GB` : `${integer.format(bytes / 1e6)} MB`;

/** "62 MB de 1 GB usados (6 %)", con el nivel de aviso y cuántas fotos más entran. */
export function storageUsage(usage: StorageUsage, limit = FREE_STORAGE_BYTES) {
  const ratio = limit ? usage.bytes / limit : 0;
  const percent = Math.round(ratio * 100);
  const level: UsageLevel =
    ratio >= CRITICAL_AT ? 'critical' : ratio >= WARNING_AT ? 'warning' : 'ok';
  const perPhoto = usage.photos ? usage.bytes / usage.photos : 0;
  const remainingPhotos = perPhoto
    ? Math.max(0, Math.floor((limit - usage.bytes) / perPhoto))
    : null;
  return {
    percent,
    level,
    remainingPhotos,
    text: `${size(usage.bytes)} de ${size(limit)} usados (${percent} %)`,
  };
}
