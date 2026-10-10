import { describe, expect, it } from 'vitest';
import { syncSearchText } from './search-sync';

describe('syncSearchText', () => {
  it('cuando el usuario terminó de escribir, lleva el texto a la URL', () => {
    expect(
      syncSearchText({ url: 'pas', synced: 'pas', text: 'pastilla', debounced: 'pastilla' }),
    ).toEqual({
      writeUrl: 'pastilla',
      synced: 'pastilla',
    });
  });

  it('mientras el usuario sigue escribiendo, no toca la URL', () => {
    expect(
      syncSearchText({ url: 'pas', synced: 'pas', text: 'pastil', debounced: 'past' }),
    ).toEqual({
      synced: 'pas',
    });
  });

  it('si la URL cambió desde afuera (atrás, link compartido), el buscador toma la URL', () => {
    expect(
      syncSearchText({ url: 'bujia', synced: 'pastilla', text: 'pastilla', debounced: 'pastilla' }),
    ).toEqual({
      setText: 'bujia',
      synced: 'bujia',
    });
  });

  it('después de tomar la URL, el texto viejo que quedó en el debounce no la pisa', () => {
    expect(
      syncSearchText({ url: 'bujia', synced: 'bujia', text: 'bujia', debounced: 'pastilla' }),
    ).toEqual({
      synced: 'bujia',
    });
  });

  it('ignora espacios de más al comparar', () => {
    expect(
      syncSearchText({ url: 'onix', synced: 'onix', text: 'onix ', debounced: 'onix ' }),
    ).toEqual({
      synced: 'onix',
    });
  });
});
