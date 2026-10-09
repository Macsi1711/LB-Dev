import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

const ok = {
  VITE_SUPABASE_URL: 'http://127.0.0.1:55421',
  VITE_SUPABASE_ANON_KEY: 'sb_publishable_abc',
};

describe('loadConfig', () => {
  it('devuelve la config tipada', () => {
    expect(loadConfig(ok)).toEqual({
      supabaseUrl: 'http://127.0.0.1:55421',
      supabaseKey: 'sb_publishable_abc',
    });
  });

  it('dice qué variable falta', () => {
    expect(() => loadConfig({ ...ok, VITE_SUPABASE_URL: undefined })).toThrow(
      'Falta la variable de entorno VITE_SUPABASE_URL',
    );
    expect(() => loadConfig({ ...ok, VITE_SUPABASE_ANON_KEY: ' ' })).toThrow(
      'Falta la variable de entorno VITE_SUPABASE_ANON_KEY',
    );
  });

  it('rechaza una URL inválida', () => {
    expect(() => loadConfig({ ...ok, VITE_SUPABASE_URL: 'supabase' })).toThrow(
      'VITE_SUPABASE_URL no es una URL válida',
    );
  });

  it('se niega a arrancar con una clave secreta en el frontend', () => {
    const jwt = (role: string) => `x.${btoa(JSON.stringify({ role })).replace(/=+$/, '')}.y`;
    expect(() => loadConfig({ ...ok, VITE_SUPABASE_ANON_KEY: 'sb_secret_abc' })).toThrow(
      /clave secreta/,
    );
    expect(() => loadConfig({ ...ok, VITE_SUPABASE_ANON_KEY: jwt('service_role') })).toThrow(
      /clave secreta/,
    );
    expect(loadConfig({ ...ok, VITE_SUPABASE_ANON_KEY: jwt('anon') }).supabaseKey).toBe(
      jwt('anon'),
    );
  });
});
