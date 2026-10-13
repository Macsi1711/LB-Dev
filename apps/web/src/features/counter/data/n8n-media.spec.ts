import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaError } from '../domain/media';
import { createN8nMedia } from './n8n-media';

const URL_WEBHOOK = 'https://n8n.example.com/webhook/lois-consulta-web';
const token = () => Promise.resolve('token-de-prueba');
const audio = new Blob(['x'], { type: 'audio/webm;codecs=opus' });
const photo = new Blob(['x'], { type: 'image/jpeg' });

function respond(status: number, body: unknown = {}) {
  const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const reason = (p: Promise<unknown>) =>
  p.then(
    () => 'no falló',
    (e: unknown) => (e instanceof MediaError ? e.reason : 'otro error'),
  );

afterEach(() => vi.unstubAllGlobals());

describe('createN8nMedia', () => {
  it('manda el archivo con el tipo y el token, y devuelve el texto a buscar', async () => {
    const fetchMock = respond(200, { texto: 'pastilla onix', transcripcion: '¿Pastillas Onix?' });
    const result = await createN8nMedia(URL_WEBHOOK, token).understand('photo', photo);

    expect(result).toEqual({ text: 'pastilla onix', heard: '¿Pastillas Onix?' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(URL_WEBHOOK);
    expect(init.headers).toEqual({ Authorization: 'Bearer token-de-prueba' });
    const body = init.body as FormData;
    expect(body.get('tipo')).toBe('foto');
    expect((body.get('archivo') as File).name).toBe('consulta.jpg');
  });

  it('el audio va como "audio", con la extensión de su formato', async () => {
    const fetchMock = respond(200, { texto: 'bujía' });
    await createN8nMedia(URL_WEBHOOK, token).understand('audio', audio);
    const body = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData;
    expect(body.get('tipo')).toBe('audio');
    expect((body.get('archivo') as File).name).toBe('consulta.webm');
  });

  it('sin sesión no llama al webhook', async () => {
    const fetchMock = respond(200);
    const media = createN8nMedia(URL_WEBHOOK, () => Promise.resolve(null));
    expect(await reason(media.understand('audio', audio))).toBe('unauthorized');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'unauthorized'],
    [413, 'too-large'],
    [500, 'failed'],
  ])('un %i se traduce en %s', async (status, expected) => {
    respond(status);
    expect(await reason(createN8nMedia(URL_WEBHOOK, token).understand('audio', audio))).toBe(
      expected,
    );
  });

  it('si n8n no contesta, es una falla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    expect(await reason(createN8nMedia(URL_WEBHOOK, token).understand('audio', audio))).toBe(
      'failed',
    );
  });

  it('si no entendió nada, lo avisa', async () => {
    respond(200, { texto: '' });
    expect(await reason(createN8nMedia(URL_WEBHOOK, token).understand('photo', photo))).toBe(
      'not-understood',
    );
  });
});
