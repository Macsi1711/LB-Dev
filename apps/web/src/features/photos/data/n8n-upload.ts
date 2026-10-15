import { parseUploadResponse, UploadError } from '../domain/upload';
import type { PhotoUploadPort } from '../domain/ports';

/** Webhook "Lois Subir foto" de n8n (contrato en docs/n8n.md). */
export function createN8nUpload(
  url: string,
  getToken: () => Promise<string | null>,
): PhotoUploadPort {
  return {
    async upload(code, photo) {
      const token = await getToken();
      if (!token) throw new UploadError('unauthorized');

      const body = new FormData();
      body.append('codigo', code);
      body.append('archivo', photo, 'foto.jpg');

      let res: Response;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body,
        });
      } catch {
        throw new UploadError('failed');
      }
      if (res.status === 401 || res.status === 403) throw new UploadError('unauthorized');
      if (res.status === 413) throw new UploadError('too-large');
      if (!res.ok) throw new UploadError('failed');
      return parseUploadResponse(await res.json().catch(() => null));
    },
  };
}
