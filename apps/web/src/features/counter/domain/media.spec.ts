import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  MediaError,
  mediaErrorMessage,
  codeNotFoundNotice,
  parseUnderstood,
  photoCode,
  photoFallback,
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
    ).toEqual({ text: 'pastilla freno onix', heard: '¿Tenés pastillas?', part: null });
  });

  it('la transcripción es opcional', () => {
    expect(parseUnderstood({ texto: 'BUJ-10' })).toEqual({
      text: 'BUJ-10',
      heard: null,
      part: null,
    });
    expect(parseUnderstood({ texto: 'BUJ-10', transcripcion: '  ' }).heard).toBeNull();
  });

  it('sin texto, es que no se entendió', () => {
    expect(reasonOf(() => parseUnderstood({ texto: '   ' }))).toBe('not-understood');
  });

  it('una respuesta con otra forma es una falla', () => {
    expect(reasonOf(() => parseUnderstood(null))).toBe('failed');
    expect(reasonOf(() => parseUnderstood({ texto: 3 }))).toBe('failed');
    expect(reasonOf(() => parseUnderstood({ texto: 'x', transcripcion: 3 }))).toBe('failed');
    expect(reasonOf(() => parseUnderstood({ texto: 'x', pieza: 3 }))).toBe('failed');
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

describe('mediaErrorMessage', () => {
  it('si no se entendió, sugiere cómo mejorar según sea audio o foto', () => {
    expect(mediaErrorMessage('audio', 'not-understood')).toMatch(/No entendí el audio/);
    expect(mediaErrorMessage('photo', 'not-understood')).toMatch(/No pude leer la foto/);
  });

  it('cada motivo tiene su mensaje', () => {
    expect(mediaErrorMessage('audio', 'unauthorized')).toMatch(/Avisale al admin/);
    expect(mediaErrorMessage('photo', 'too-large')).toMatch(/muy pesada/);
    expect(mediaErrorMessage('audio', 'too-large')).toMatch(/muy largo/);
    expect(mediaErrorMessage('photo', 'failed')).toMatch(/No pude procesar la foto/);
    expect(mediaErrorMessage('audio', 'failed')).toMatch(/No pude procesar el audio/);
    expect(mediaErrorMessage('audio', 'mic-denied')).toMatch(/permiso/);
    expect(mediaErrorMessage('audio', 'no-mic')).toMatch(/no puede grabar/);
  });
});

describe('photoCode', () => {
  it('usa el código que leyó aunque la IA buscó palabras (caso real: S1978)', () => {
    expect(photoCode({ text: 'pastilla freno', heard: 'S1978' })).toBe('S1978');
  });

  it('saca las palabras que la IA mezcló con el código (caso real: SYL2095)', () => {
    expect(photoCode({ text: 'sistema frenos SYL2095', heard: 'SYL2095 024/264 265/024' })).toBe(
      'SYL2095',
    );
  });

  it('sin código legible no hay código (caso real: "pastilla de freno")', () => {
    expect(photoCode({ text: 'pastilla freno', heard: 'pastilla de freno' })).toBeNull();
    expect(photoCode({ text: 'filtro aceite gol trend', heard: null })).toBeNull();
  });

  it('prefiere el código con letras y números al que es solo número', () => {
    expect(photoCode({ text: 'pastilla', heard: 'SELVIR 36060 · ADB-486' })).toBe('ADB-486');
    expect(photoCode({ text: 'pastilla', heard: 'SELVIR 36060' })).toBe('36060');
    expect(photoCode({ text: 'PD/363', heard: null })).toBe('PD/363');
  });

  it('prefiere lo que eligió la IA para buscar antes que el resto de la etiqueta', () => {
    expect(photoCode({ text: 'PH5796', heard: 'FRAM PH5796 lote AB1234' })).toBe('PH5796');
  });

  it('no confunde medidas, años, códigos de barra ni el DOT del líquido con un código', () => {
    const none = [
      'pastilla 119MM',
      'corolla 2010',
      '7791234567890',
      'liquido frenos DOT4',
      'medidas 024/264',
      'motor 1.6 16v',
    ];
    for (const heard of none) expect(photoCode({ text: 'x', heard }), heard).toBeNull();
  });

  it('lo devuelve en mayúsculas y sin puntuación alrededor', () => {
    expect(photoCode({ text: 'x', heard: 'código: syl2095.' })).toBe('SYL2095');
  });
});

describe('parseUnderstood con la pieza', () => {
  it('lee qué pieza es, para buscarla si el código no está en el catálogo', () => {
    expect(
      parseUnderstood({
        texto: 'CH10246',
        transcripcion: 'FRAM CH10246',
        pieza: ' filtro  aceite cartucho ',
      }),
    ).toEqual({ text: 'CH10246', heard: 'FRAM CH10246', part: 'filtro aceite cartucho' });
    expect(parseUnderstood({ texto: 'CH10246', pieza: '  ' }).part).toBeNull();
  });
});

describe('photoFallback', () => {
  it('si el código no está, busca la pieza (caso real: filtro FRAM CH10246)', () => {
    expect(photoFallback({ text: 'CH10246', part: 'filtro aceite cartucho' }, 'CH10246')).toBe(
      'filtro aceite cartucho',
    );
  });

  it('sin pieza usa las palabras que la IA puso junto al código', () => {
    expect(photoFallback({ text: 'sistema frenos SYL2095', part: null }, 'SYL2095')).toBe(
      'sistema frenos',
    );
  });

  it('no repite el mismo código ni devuelve vacío', () => {
    expect(photoFallback({ text: 'CH10246', part: null }, 'CH10246')).toBeNull();
    expect(photoFallback({ text: 'ch10246', part: 'CH10246' }, 'CH10246')).toBeNull();
  });
});

describe('codeNotFoundNotice', () => {
  it('dice qué código no encontró y qué buscó en su lugar', () => {
    expect(codeNotFoundNotice('CH10246', 'filtro aceite cartucho')).toBe(
      'No encontré el código CH10246 en el catálogo. Busqué «filtro aceite cartucho»: fijate si es alguno de estos.',
    );
  });

  it('sin nada para buscar en su lugar, pide escribir la pieza', () => {
    expect(codeNotFoundNotice('CH10246', null)).toBe(
      'No encontré el código CH10246 en el catálogo. Probá escribir la pieza y el auto.',
    );
  });
});
