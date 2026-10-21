/** Consultas con audio o foto: n8n las pasa a texto y la web busca ese texto (ADR-005). */
export type MediaKind = 'audio' | 'photo';

export const MAX_AUDIO_SECONDS = 60;

export interface Understood {
  /** Lo que se busca, listo para la caja del chat. */
  text: string;
  /** Lo que se escuchó o se leyó, para mostrarlo en la burbuja. */
  heard: string | null;
  /** En una foto, qué pieza es (sin el código): se busca si el código no está en el catálogo. */
  part: string | null;
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

const optionalText = (v: unknown): string | null => {
  if (v !== undefined && v !== null && typeof v !== 'string') throw new MediaError('failed');
  return v ? clean(v) || null : null;
};

/** La respuesta del webhook de n8n: { texto, transcripcion?, pieza? }. */
export function parseUnderstood(raw: unknown): Understood {
  if (!isRecord(raw) || typeof raw.texto !== 'string') throw new MediaError('failed');
  const heard = optionalText(raw.transcripcion);
  const part = optionalText(raw.pieza);
  const text = clean(raw.texto);
  if (!text) throw new MediaError('not-understood');
  return { text, heard, part };
}

// Lo que en una etiqueta tiene números pero no es un código de artículo.
const NOT_A_CODE = [
  /^\d+([.,]\d+)?(mm|cm|ml|lts?|kg|cc|hp|v|w)$/i, // medidas: 119MM, 500ML
  /^dot\d$/i, // líquido de frenos
  /^(19|20)\d\d$/, // años
];

function isCode(token: string): boolean {
  const alnum = token.replace(/[^a-z0-9]/gi, '');
  if (!/^[a-z0-9./-]+$/i.test(token) || alnum.length < 4 || !/\d/.test(token)) return false;
  if (NOT_A_CODE.some((re) => re.test(token))) return false;
  // Solo números: con barra son medidas o referencias (024/264); con 12 o más, un código de barras.
  if (/^\d+$/.test(alnum)) return !token.includes('/') && alnum.length <= 11;
  return true;
}

const codesIn = (s: string | null) =>
  (s ?? '')
    .split(/[\s,;:()«»"'·|]+/)
    .map((t) => t.replace(/^[./-]+|[./-]+$/g, ''))
    .filter(isCode);

/**
 * El código de artículo que se leyó en una foto, para buscar solo eso: la IA a veces lo deja en
 * lo que leyó o lo mezcla con palabras, y entonces salen todas las pastillas. Primero el que
 * tiene letras y números (SYL2095, PD/363) y después el que es solo número (36060); primero lo
 * que la IA eligió para buscar y después el resto de la etiqueta. null si no se leyó ninguno.
 */
export function photoCode({ text, heard }: Pick<Understood, 'text' | 'heard'>): string | null {
  const all = [...codesIn(text), ...codesIn(heard)];
  const code = all.find((c) => /[a-z]/i.test(c)) ?? all[0];
  return code ? code.toUpperCase() : null;
}

const sameCode = (a: string, b: string) =>
  a.replace(/[^a-z0-9]/gi, '').toUpperCase() === b.replace(/[^a-z0-9]/gi, '').toUpperCase();

/**
 * Qué buscar si el código leído no está en el catálogo (por ejemplo el de otra marca, como
 * FRAM CH10246): la pieza que dijo la IA o, si no la dijo, las palabras que puso junto al código.
 */
export function photoFallback(
  { text, part }: Pick<Understood, 'text' | 'part'>,
  code: string,
): string | null {
  const words = clean(
    text
      .split(' ')
      .filter((w) => !sameCode(w, code))
      .join(' '),
  );
  return [part, words].find((c) => c && !sameCode(c, code)) ?? null;
}

export const codeNotFoundNotice = (code: string, fallback: string | null): string =>
  fallback
    ? `No encontré el código ${code} en el catálogo. Busqué «${fallback}»: fijate si es alguno de estos.`
    : `No encontré el código ${code} en el catálogo. Probá escribir la pieza y el auto.`;

/** Aviso cuando una foto no tenía código: se busca igual, pero puede traer muchas parecidas. */
export const PHOTO_WITHOUT_CODE =
  'No pude leer ningún código en la foto, así que busqué por lo que se ve. Para encontrar la pieza exacta, sacala de cerca al código grabado en la pieza o en la caja.';

export function formatDuration(seconds: number): string {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const AUDIO_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

/** El primer formato que el navegador sabe grabar; null deja que elija él. */
export function pickAudioType(isSupported: (type: string) => boolean): string | null {
  return AUDIO_TYPES.find(isSupported) ?? null;
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
