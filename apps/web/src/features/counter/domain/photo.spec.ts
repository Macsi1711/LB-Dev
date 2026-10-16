import { describe, expect, it } from 'vitest';
import { photoCandidates, photoLink } from './photo';

const storage = { full: 'https://x/fotos/12/Tok.jpg', mini: 'https://x/fotos/12/Tok.mini.jpg' };

describe('photoCandidates', () => {
  it('en una tarjeta chica prueba la miniatura de Storage, después la grande y al final Drive', () => {
    expect(photoCandidates(storage, 'abc')).toEqual([
      storage.mini,
      storage.full,
      'https://drive.google.com/thumbnail?id=abc&sz=w400',
      'https://lh3.googleusercontent.com/d/abc=w400',
    ]);
  });

  it('para verla grande va directo a la foto grande', () => {
    expect(photoCandidates(storage, null, 1000)).toEqual([storage.full]);
  });

  it('si todavía no está en Storage, usa Drive como hasta ahora', () => {
    expect(photoCandidates(null, 'abc', 1000)).toEqual([
      'https://drive.google.com/thumbnail?id=abc&sz=w1000',
      'https://lh3.googleusercontent.com/d/abc=w1000',
    ]);
  });

  it('sin ninguna foto no hay nada que probar', () => {
    expect(photoCandidates(null, null)).toEqual([]);
  });
});

describe('photoLink', () => {
  it('abre la foto grande de Storage; si no hay, la de Drive', () => {
    expect(photoLink(storage, 'abc')).toBe(storage.full);
    expect(photoLink(null, 'abc')).toBe('https://drive.google.com/file/d/abc/view?usp=drivesdk');
    expect(photoLink(null, null)).toBeNull();
  });
});
