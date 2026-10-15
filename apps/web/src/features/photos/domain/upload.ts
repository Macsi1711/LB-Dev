/** Fotos subidas desde la web: n8n las sube a Drive y la web las asigna (ADR-007). */
export type UploadErrorReason = 'unauthorized' | 'too-large' | 'failed' | 'not-image';

export class UploadError extends Error {
  constructor(readonly reason: UploadErrorReason) {
    super(reason);
    this.name = 'UploadError';
  }
}

export const toUploadError = (e: unknown): UploadError =>
  e instanceof UploadError ? e : new UploadError('failed');

// Mismo criterio que asignar_imagen_drive() en la base.
const DRIVE_ID = /^[A-Za-z0-9_-]{10,200}$/;

/** La respuesta del webhook de n8n: { drive_id }. */
export function parseUploadResponse(raw: unknown): string {
  const id =
    typeof raw === 'object' && raw !== null ? (raw as { drive_id?: unknown }).drive_id : null;
  if (typeof id !== 'string' || !DRIVE_ID.test(id)) throw new UploadError('failed');
  return id;
}

export const isImage = (file: { type: string }) => file.type.startsWith('image/');

export function uploadErrorMessage(reason: UploadErrorReason): string {
  switch (reason) {
    case 'unauthorized':
      return 'Tu sesión venció. Volvé a entrar para subir fotos.';
    case 'too-large':
      return 'La foto es muy pesada. Probá con otra.';
    case 'not-image':
      return 'Ese archivo no es una imagen. Elegí una foto.';
    case 'failed':
      return 'No se pudo subir la foto. Probá de nuevo.';
  }
}
