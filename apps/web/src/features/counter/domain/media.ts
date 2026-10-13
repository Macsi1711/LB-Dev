/** Consultas con audio o foto: n8n las pasa a texto y la web busca ese texto (ADR-005). */
export type MediaKind = 'audio' | 'photo';

export const MAX_AUDIO_SECONDS = 60;
export const MAX_PHOTO_SIDE = 1600;

export interface Understood {
  /** Lo que se busca, listo para la caja del chat. */
  text: string;
  /** Lo que se escuchó o se leyó, para mostrarlo en la burbuja. */
  heard: string | null;
}

export type MediaErrorReason =
  'not-understood' | 'unauthorized' | 'too-large' | 'failed' | 'mic-denied' | 'no-mic';

export class MediaError extends Error {
  constructor(readonly reason: MediaErrorReason) {
    super(reason);
    this.name = 'MediaError';
  }
}

export const toMediaError = (e: unknown): MediaError =>
  e instanceof MediaError ? e : new MediaError('failed');

const clean = (s: string) => s.trim().replace(/\s+/g, ' ');
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** La respuesta del webhook de n8n: { texto, transcripcion? }. */
export function parseUnderstood(raw: unknown): Understood {
  if (!isRecord(raw) || typeof raw.texto !== 'string') throw new MediaError('failed');
  const heard = raw.transcripcion;
  if (heard !== undefined && heard !== null && typeof heard !== 'string') {
    throw new MediaError('failed');
  }
  const text = clean(raw.texto);
  if (!text) throw new MediaError('not-understood');
  return { text, heard: heard ? clean(heard) || null : null };
}

export function formatDuration(seconds: number): string {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const AUDIO_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

/** El primer formato que el navegador sabe grabar; null deja que elija él. */
export function pickAudioType(isSupported: (type: string) => boolean): string | null {
  return AUDIO_TYPES.find(isSupported) ?? null;
}

/** Medidas para achicar una foto sin deformarla; nunca la agranda. */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function mediaErrorMessage(kind: MediaKind, reason: MediaErrorReason): string {
  const audio = kind === 'audio';
  switch (reason) {
    case 'not-understood':
      return audio
        ? 'No entendí el audio. Probá de nuevo, más cerca del micrófono, o escribilo.'
        : 'No pude leer la foto. Probá con más luz y que se vea la etiqueta o el código, o escribilo.';
    case 'unauthorized':
      return 'Tu sesión venció. Volvé a entrar para mandar audios y fotos.';
    case 'too-large':
      return audio
        ? 'El audio es muy largo. Probá con uno más corto.'
        : 'La foto es muy pesada. Probá con otra.';
    case 'failed':
      return `No pude procesar ${audio ? 'el audio' : 'la foto'}. Probá de nuevo o escribilo.`;
    case 'mic-denied':
      return 'No tengo permiso para usar el micrófono. Habilitalo en el navegador y probá de nuevo.';
    case 'no-mic':
      return 'Este navegador no puede grabar audio. Escribí la consulta o mandá una foto.';
  }
}
