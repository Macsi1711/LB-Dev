import { describe, expect, it } from 'vitest';
import {
  fitWithin,
  formatDuration,
  MediaError,
  mediaErrorMessage,
  parseUnderstood,
  pickAudioType,
  toMediaError,
} from './media';

const reasonOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof MediaError ? e.reason : 'otro error';
  }
  return 'no tiró';
};

describe('parseUnderstood', () => {
  it('toma el texto a buscar limpio y lo que se escuchó o se leyó', () => {
    expect(
      parseUnderstood({ texto: '  pastilla   freno onix ', transcripcion: ' ¿Tenés pastillas? ' }),
    ).toEqual({ text: 'pastilla freno onix', heard: '¿Tenés pastillas?' });
  });

  it('la transcripción es opcional', () => {
    expect(parseUnderstood({ texto: 'BUJ-10' })).toEqual({ text: 'BUJ-10', heard: null });
    expect(parseUnderstood({ texto: 'BUJ-10', transcripcion: '  ' }).heard).toBeNull();
  });

  it('sin texto, es que no se entendió', () => {
    expect(reasonOf(() => parseUnderstood({ texto: '   ' }))).toBe('not-understood');
  });

  it('una respuesta con otra forma es una falla', () => {
    expect(reasonOf(() => parseUnderstood(null))).toBe('failed');
    expect(reasonOf(() => parseUnderstood({ texto: 3 }))).toBe('failed');
    expect(reasonOf(() => parseUnderstood({ texto: 'x', transcripcion: 3 }))).toBe('failed');
  });
});

describe('toMediaError', () => {
  it('deja pasar un MediaError y convierte cualquier otro error en una falla', () => {
    const e = new MediaError('unauthorized');
    expect(toMediaError(e)).toBe(e);
    expect(toMediaError(new TypeError('Failed to fetch')).reason).toBe('failed');
  });
});

describe('formatDuration', () => {
  it('muestra minutos y segundos, sin redondear para arriba', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(7.9)).toBe('0:07');
    expect(formatDuration(60)).toBe('1:00');
    expect(formatDuration(75)).toBe('1:15');
  });
});

describe('pickAudioType', () => {
  it('prefiere webm con opus, como Chrome y Firefox', () => {
    expect(pickAudioType(() => true)).toBe('audio/webm;codecs=opus');
  });

  it('en Safari usa mp4', () => {
    expect(pickAudioType((t) => t === 'audio/mp4')).toBe('audio/mp4');
  });

  it('si no reconoce ninguno, deja que el navegador elija', () => {
    expect(pickAudioType(() => false)).toBeNull();
  });
});

describe('fitWithin', () => {
  it('achica el lado más largo al máximo, manteniendo la proporción', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(1200, 3000, 1600)).toEqual({ width: 640, height: 1600 });
  });

  it('una foto chica no se agranda', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});

describe('mediaErrorMessage', () => {
  it('si no se entendió, sugiere cómo mejorar según sea audio o foto', () => {
    expect(mediaErrorMessage('audio', 'not-understood')).toMatch(/No entendí el audio/);
    expect(mediaErrorMessage('photo', 'not-understood')).toMatch(/No pude leer la foto/);
  });

  it('cada motivo tiene su mensaje', () => {
    expect(mediaErrorMessage('audio', 'unauthorized')).toMatch(/sesión/);
    expect(mediaErrorMessage('photo', 'too-large')).toMatch(/muy pesada/);
    expect(mediaErrorMessage('audio', 'too-large')).toMatch(/muy largo/);
    expect(mediaErrorMessage('photo', 'failed')).toMatch(/No pude procesar la foto/);
    expect(mediaErrorMessage('audio', 'failed')).toMatch(/No pude procesar el audio/);
    expect(mediaErrorMessage('audio', 'mic-denied')).toMatch(/permiso/);
    expect(mediaErrorMessage('audio', 'no-mic')).toMatch(/no puede grabar/);
  });
});
