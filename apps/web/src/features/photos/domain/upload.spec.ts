import { describe, expect, it } from 'vitest';
import { isImage, parseUploadResponse, UploadError, uploadErrorMessage } from './upload';

const reasonOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof UploadError ? e.reason : 'otro error';
  }
  return 'no tiró';
};

describe('parseUploadResponse', () => {
  it('devuelve el id de Drive que manda n8n', () => {
    expect(parseUploadResponse({ drive_id: '1AbCdEfGhIjKl_-9' })).toBe('1AbCdEfGhIjKl_-9');
  });

  it('una respuesta sin id válido es una falla', () => {
    expect(reasonOf(() => parseUploadResponse(null))).toBe('failed');
    expect(reasonOf(() => parseUploadResponse({ drive_id: 'https://x/y' }))).toBe('failed');
    expect(reasonOf(() => parseUploadResponse({}))).toBe('failed');
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
