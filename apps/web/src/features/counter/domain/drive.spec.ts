import { describe, expect, it } from 'vitest';
import { driveViewUrl, extractDriveId, thumbnailCandidates } from './drive';

describe('extractDriveId', () => {
  it('saca el ID de un link de Drive como los que escribe n8n', () => {
    expect(extractDriveId('https://drive.google.com/file/d/1AbC_d-9XyZ/view?usp=drivesdk')).toBe(
      '1AbC_d-9XyZ',
    );
  });

  it('devuelve null si no hay link o no tiene formato de Drive', () => {
    expect(extractDriveId(null)).toBeNull();
    expect(extractDriveId('')).toBeNull();
    expect(extractDriveId('sin foto')).toBeNull();
  });
});

describe('thumbnailCandidates', () => {
  it('propone primero la miniatura de Drive y después la de googleusercontent', () => {
    expect(thumbnailCandidates('abc')).toEqual([
      'https://drive.google.com/thumbnail?id=abc&sz=w400',
      'https://lh3.googleusercontent.com/d/abc=w400',
    ]);
  });

  it('respeta el ancho pedido', () => {
    expect(thumbnailCandidates('abc', 1200)[0]).toBe(
      'https://drive.google.com/thumbnail?id=abc&sz=w1200',
    );
  });
});

describe('driveViewUrl', () => {
  it('arma el link con el formato exacto del contrato con n8n', () => {
    expect(driveViewUrl('abc')).toBe('https://drive.google.com/file/d/abc/view?usp=drivesdk');
  });
});

describe('fotos del modo demo', () => {
  it('un ID "demo/…" apunta a la ilustración local, relativa a la página', () => {
    expect(thumbnailCandidates('demo/bujia')).toEqual(['demo/bujia.svg']);
    expect(driveViewUrl('demo/bujia')).toBe('demo/bujia.svg');
  });

  it('los IDs reales de Drive nunca tienen "/", así que no se confunden', () => {
    expect(extractDriveId('https://drive.google.com/file/d/demo/view')).toBe('demo');
  });
});
