import { describe, expect, it } from 'vitest';
import { photoCandidates, photoLink } from './photo';

const storage = { full: 'https://x/fotos/12/Tok.jpg', mini: 'https://x/fotos/12/Tok.mini.jpg' };

describe('photoCandidates', () => {
  it('en una tarjeta chica prueba la miniatura y, si falla, la foto grande', () => {
    expect(photoCandidates(storage)).toEqual([storage.mini, storage.full]);
  });

  it('para verla grande va directo a la foto grande', () => {
    expect(photoCandidates(storage, 1000)).toEqual([storage.full]);
  });

  it('sin foto en Storage no hay nada que probar: Drive ya no se usa (ADR-008)', () => {
    expect(photoCandidates(null)).toEqual([]);
  });
});

describe('photoLink', () => {
  it('abre la foto grande de Storage; sin foto, no hay link', () => {
    expect(photoLink(storage)).toBe(storage.full);
    expect(photoLink(null)).toBeNull();
  });
});
