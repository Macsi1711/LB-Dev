import { afterEach, describe, expect, it, vi } from 'vitest';
import { UploadError } from '../domain/upload';
import { createN8nUpload } from './n8n-upload';

const URL_WEBHOOK = 'https://n8n.example.com/webhook/lois-subir-foto';
const token = () => Promise.resolve('token-de-prueba');
const photo = new Blob(['x'], { type: 'image/jpeg' });

function respond(status: number, body: unknown = {}) {
  const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const reason = (p: Promise<unknown>) =>
  p.then(
    () => 'no falló',
    (e: unknown) => (e instanceof UploadError ? e.reason : 'otro error'),
  );

afterEach(() => vi.unstubAllGlobals());

describe('createN8nUpload', () => {
  it('manda la foto y el código con el token, y devuelve el id de Drive', async () => {
    const fetchMock = respond(200, { drive_id: '1AbCdEfGhIjKl_-9' });
    expect(await createN8nUpload(URL_WEBHOOK, token).upload('854000', photo)).toBe(
      '1AbCdEfGhIjKl_-9',
    );
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(URL_WEBHOOK);
    expect(init.headers).toEqual({ Authorization: 'Bearer token-de-prueba' });
    const body = init.body as FormData;
    expect(body.get('codigo')).toBe('854000');
    expect((body.get('archivo') as File).name).toBe('foto.jpg');
  });

  it('sin sesión no llama al webhook', async () => {
    const fetchMock = respond(200);
    const upload = createN8nUpload(URL_WEBHOOK, () => Promise.resolve(null));
    expect(await reason(upload.upload('854000', photo))).toBe('unauthorized');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'unauthorized'],
    [413, 'too-large'],
    [500, 'failed'],
  ])('un %i se traduce en %s', async (status, expected) => {
    respond(status);
    expect(await reason(createN8nUpload(URL_WEBHOOK, token).upload('854000', photo))).toBe(
      expected,
    );
  });

  it('si n8n no contesta, es una falla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    expect(await reason(createN8nUpload(URL_WEBHOOK, token).upload('854000', photo))).toBe(
      'failed',
    );
  });
});
