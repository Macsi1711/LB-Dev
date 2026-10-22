import type { Viewer } from '@/shared/roles';

/** Cargar fotos y ver las que faltan es del admin; sin login se ve solo el contador (ADR-011). */
export const canManagePhotos = (viewer: Viewer | undefined): boolean => viewer === 'admin';
