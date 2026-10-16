/** Fotos subidas desde la web directo a Supabase Storage (ADR-008). */
export type UploadErrorReason = 'unauthorized' | 'too-large' | 'failed' | 'not-image';

export class UploadError extends Error {
  constructor(readonly reason: UploadErrorReason) {
    super(reason);
    this.name = 'UploadError';
  }
}

export const toUploadError = (e: unknown): UploadError =>
  e instanceof UploadError ? e : new UploadError('failed');

const TOKEN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Un nombre nuevo por foto (12 letras y números): la caché nunca muestra una foto vieja. */
export function photoToken(randomBytes: Uint8Array): string {
  return Array.from(randomBytes.slice(0, 12), (b) => TOKEN_CHARS[b % TOKEN_CHARS.length]).join('');
}

/** Ruta de la foto grande en el bucket; la miniatura va al lado (`.mini.jpg`). */
export const photoPath = (articleId: number, token: string) => `${articleId}/${token}.jpg`;

/** Por qué no se pudo subir, según el código HTTP que devolvió Supabase. */
export function uploadErrorReason(status: number | undefined): UploadErrorReason {
  if (status === 413) return 'too-large';
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 415) return 'not-image';
  return 'failed';
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
