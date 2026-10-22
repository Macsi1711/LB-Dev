import { describe, expect, it } from 'vitest';
import { viewerOf } from './viewer';

const session = { userId: 'u1', email: 'ana@lois.com' };

describe('viewerOf', () => {
  it('sin sesión es anónimo', () => {
    expect(viewerOf(null, undefined)).toBe('anonimo');
  });

  it('con sesión, el rol del perfil', () => {
    expect(viewerOf(session, { userId: 'u1', name: 'Ana', role: 'admin' })).toBe('admin');
    expect(viewerOf(session, { userId: 'u1', name: 'Ana', role: 'vendedor' })).toBe('vendedor');
  });

  it('mientras se lee la sesión o el perfil, todavía no se sabe', () => {
    expect(viewerOf(undefined, undefined)).toBeUndefined();
    expect(viewerOf(session, undefined)).toBeUndefined();
  });
});
