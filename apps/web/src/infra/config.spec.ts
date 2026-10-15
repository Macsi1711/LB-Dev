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
      n8nConsultaUrl: null,
      n8nFotosUrl: null,
    });
  });

  it('el webhook de fotos también es opcional y https', () => {
    const url = 'https://n8n.example.com/webhook/lois-subir-foto';
    expect(loadConfig({ ...ok, VITE_N8N_FOTOS_URL: url }).n8nFotosUrl).toBe(url);
    expect(() => loadConfig({ ...ok, VITE_N8N_FOTOS_URL: 'http://n8n.example.com/x' })).toThrow(
      'VITE_N8N_FOTOS_URL tiene que ser https',
    );
  });

  it('el webhook de n8n es opcional y tiene que ser https (salvo en localhost)', () => {
    const url = 'https://n8n.example.com/webhook/lois-consulta-web';
    expect(loadConfig({ ...ok, VITE_N8N_CONSULTA_URL: url }).n8nConsultaUrl).toBe(url);
    expect(loadConfig({ ...ok, VITE_N8N_CONSULTA_URL: ' ' }).n8nConsultaUrl).toBeNull();
    expect(
      loadConfig({ ...ok, VITE_N8N_CONSULTA_URL: 'http://localhost:5678/webhook/x' })
        .n8nConsultaUrl,
    ).toBe('http://localhost:5678/webhook/x');
    expect(() => loadConfig({ ...ok, VITE_N8N_CONSULTA_URL: 'http://n8n.example.com/x' })).toThrow(
      'VITE_N8N_CONSULTA_URL tiene que ser https',
    );
    expect(() => loadConfig({ ...ok, VITE_N8N_CONSULTA_URL: 'n8n' })).toThrow(
      'VITE_N8N_CONSULTA_URL no es una URL válida',
    );
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
