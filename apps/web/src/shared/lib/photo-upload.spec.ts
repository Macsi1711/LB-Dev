import { describe, expect, it } from 'vitest';
import {
  isImage,
  photoPath,
  photoToken,
  uploadErrorMessage,
  uploadErrorReason,
} from './photo-upload';

describe('photoPath', () => {
  it('la foto nueva va en la carpeta del artículo, con un nombre que nunca se repite', () => {
    expect(photoPath(15, 'AbCdEf123456')).toBe('15/AbCdEf123456.jpg');
  });
});

describe('photoToken', () => {
  it('pasa bytes al azar a 12 letras y números (lo que acepta el bucket)', () => {
    const token = photoToken(new Uint8Array([0, 1, 25, 26, 51, 52, 61, 62, 63, 255, 128, 7]));
    expect(token).toMatch(/^[A-Za-z0-9]{12}$/);
    expect(token.slice(0, 7)).toBe('ABZaz09');
  });
});

describe('uploadErrorReason', () => {
  it('según lo que contesta Supabase, explica por qué no se pudo subir', () => {
    expect(uploadErrorReason(413)).toBe('too-large');
    expect(uploadErrorReason(401)).toBe('unauthorized');
    expect(uploadErrorReason(403)).toBe('unauthorized');
    expect(uploadErrorReason(415)).toBe('not-image');
    expect(uploadErrorReason(500)).toBe('failed');
    expect(uploadErrorReason(undefined)).toBe('failed');
  });
});

describe('isImage', () => {
  it('acepta solo imágenes', () => {
    expect(isImage({ type: 'image/jpeg' })).toBe(true);
    expect(isImage({ type: 'image/heic' })).toBe(true);
    expect(isImage({ type: 'application/pdf' })).toBe(false);
  });
});

describe('uploadErrorMessage', () => {
  it('cada motivo tiene su mensaje', () => {
    expect(uploadErrorMessage('unauthorized')).toMatch(/sesión/);
    expect(uploadErrorMessage('too-large')).toMatch(/pesada/);
    expect(uploadErrorMessage('not-image')).toMatch(/imagen/);
    expect(uploadErrorMessage('failed')).toMatch(/No se pudo subir/);
  });
});
