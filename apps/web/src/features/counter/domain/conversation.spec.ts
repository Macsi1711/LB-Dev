import { describe, expect, it } from 'vitest';
import {
  canSend,
  filterLabels,
  MAX_HISTORY,
  failedMediaLog,
  queryLog,
  replySummary,
  restoreHistory,
  sendQuery,
  type ChatQuery,
} from './conversation';
import type { SearchState } from './search-state';

const state = (q: string, extra: Partial<SearchState> = {}): SearchState => ({
  q,
  family: null,
  withPhoto: false,
  ...extra,
});
const query = (id: string, s: SearchState): ChatQuery => ({ id, state: s, sentAt: 1 });

describe('canSend', () => {
  it('se puede mandar con texto o con una familia elegida', () => {
    expect(canSend(state('onix'))).toBe(true);
    expect(canSend(state('', { family: 'PF' }))).toBe(true);
  });

  it('no se manda un mensaje vacío, aunque esté prendido "solo con foto"', () => {
    expect(canSend(state('   '))).toBe(false);
    expect(canSend(state('', { withPhoto: true }))).toBe(false);
  });
});

describe('sendQuery', () => {
  it('agrega la consulta al final, con el texto limpio de espacios de más', () => {
    const history = sendQuery([], state('  pastilla   onix '), { id: 'a', sentAt: 10 });
    expect(history).toEqual([{ id: 'a', state: state('pastilla onix'), sentAt: 10 }]);
  });

  it('no repite la misma consulta dos veces seguidas', () => {
    const history = [query('a', state('onix'))];
    expect(sendQuery(history, state('Onix '), { id: 'b', sentAt: 2 })).toBe(history);
  });

  it('la misma palabra con otro filtro es otra consulta', () => {
    const history = [query('a', state('onix'))];
    expect(
      sendQuery(history, state('onix', { withPhoto: true }), { id: 'b', sentAt: 2 }),
    ).toHaveLength(2);
  });

  it('ignora lo que no se puede mandar', () => {
    const history = [query('a', state('onix'))];
    expect(sendQuery(history, state(''), { id: 'b', sentAt: 2 })).toBe(history);
  });

  it(`guarda solo las últimas ${MAX_HISTORY}`, () => {
    let history: ChatQuery[] = [];
    for (let i = 0; i < MAX_HISTORY + 5; i++)
      history = sendQuery(history, state(`q${i}`), { id: `${i}`, sentAt: i });
    expect(history).toHaveLength(MAX_HISTORY);
    expect(history[0]?.state.q).toBe('q5');
    expect(history.at(-1)?.state.q).toBe(`q${MAX_HISTORY + 4}`);
  });
});

describe('sendQuery con audio o foto', () => {
  it('guarda de dónde vino y lo que se escuchó', () => {
    const history = sendQuery([], state('pastilla onix'), {
      id: 'a',
      sentAt: 1,
      source: 'audio',
      heard: '¿Tenés pastillas para el Onix?',
    });
    expect(history[0]).toMatchObject({ source: 'audio', heard: '¿Tenés pastillas para el Onix?' });
  });

  it('un audio o una foto se agrega aunque diga lo mismo que el mensaje anterior', () => {
    const history = [query('a', state('onix'))];
    expect(sendQuery(history, state('onix'), { id: 'b', sentAt: 2, source: 'photo' })).toHaveLength(
      2,
    );
  });
});

describe('restoreHistory', () => {
  it('recupera audios y fotos, y descarta un origen desconocido', () => {
    const audio = { ...query('a', state('onix')), source: 'audio', heard: 'onix' };
    const photo = { ...query('b', state('BUJ-10')), source: 'photo' };
    expect(restoreHistory([audio, photo, { ...query('c', state('x')), source: 'video' }])).toEqual([
      audio,
      photo,
    ]);
    expect(restoreHistory([{ ...audio, heard: 3 }])).toEqual([]);
  });

  it('recupera lo guardado y descarta lo que no tiene la forma esperada', () => {
    const ok = query('a', state('onix', { family: 'PF' }));
    expect(
      restoreHistory([ok, null, { id: 'b' }, { id: 'c', sentAt: 1, state: { q: 3 } }, 'x']),
    ).toEqual([ok]);
  });

  it('si lo guardado no es una lista, arranca vacío', () => {
    expect(restoreHistory(undefined)).toEqual([]);
    expect(restoreHistory({ id: 'a' })).toEqual([]);
  });
});

describe('replySummary', () => {
  it('cuenta lo que encontró para el texto', () => {
    expect(replySummary(1, state('onix'))).toBe('Encontré 1 artículo para «onix».');
    expect(replySummary(1234, state('pastilla'))).toBe('Encontré 1.234 artículos para «pastilla».');
  });

  it('sin texto, cuenta los artículos de la familia', () => {
    expect(replySummary(12, state('', { family: 'PF' }), 'Pastillas de freno')).toBe(
      'Hay 12 artículos en Pastillas de freno.',
    );
    expect(replySummary(1, state('', { family: 'PF' }))).toBe('Hay 1 artículo en PF.');
  });

  it('si no encontró nada, sugiere qué probar', () => {
    expect(replySummary(0, state('pastilla xyz'))).toBe(
      'No encontré nada para «pastilla xyz». Probá con menos palabras.',
    );
    expect(replySummary(0, state('xyz', { family: 'PF', withPhoto: true }))).toBe(
      'No encontré nada para «xyz». Probá con menos palabras o sacá los filtros.',
    );
    expect(replySummary(0, state('', { family: 'PF' }))).toBe('No hay artículos con esos filtros.');
  });

  it('si no encontró todo junto, aclara que muestra lo más parecido', () => {
    expect(replySummary(3, state('pastiya onix'), null, true)).toBe(
      'No encontré «pastiya onix» tal cual. Esto es lo más parecido (3 artículos):',
    );
  });
});

describe('filterLabels', () => {
  it('describe los filtros que acompañan al mensaje', () => {
    expect(filterLabels(state('onix'))).toEqual([]);
    expect(filterLabels(state('onix', { family: 'PF', withPhoto: true }), 'Pastillas')).toEqual([
      'Pastillas',
      'Con foto',
    ]);
    expect(filterLabels(state('onix', { family: 'PF' }))).toEqual(['PF']);
  });
});

describe('queryLog', () => {
  it('arma lo que se guarda en las métricas a partir del mensaje', () => {
    expect(queryLog(query('a', state('onix', { family: 'PF', withPhoto: true })))).toEqual({
      q: 'onix',
      family: 'PF',
      withPhoto: true,
      source: 'texto',
      heard: null,
      error: null,
    });
  });

  it('un audio o una foto guardan su origen y lo que se entendió', () => {
    const audio = {
      ...query('a', state('pastilla onix')),
      source: 'audio' as const,
      heard: '¿Pastillas?',
    };
    expect(queryLog(audio)).toMatchObject({ source: 'audio', heard: '¿Pastillas?' });
    expect(queryLog({ ...query('b', state('x')), source: 'photo' })).toMatchObject({
      source: 'foto',
    });
  });

  it('un audio o una foto que no se entendieron se guardan con el error y los filtros', () => {
    expect(failedMediaLog('photo', state('', { family: 'BU' }), 'No pude leer la foto.')).toEqual({
      q: null,
      family: 'BU',
      withPhoto: false,
      source: 'foto',
      heard: null,
      error: 'No pude leer la foto.',
    });
  });
});
