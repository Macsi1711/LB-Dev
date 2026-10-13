import { MediaError, parseUnderstood, type MediaKind } from '../domain/media';
import type { MediaPort } from '../domain/ports';

const FILE_NAME: Record<string, string> = {
  'audio/webm': 'consulta.webm',
  'audio/mp4': 'consulta.m4a',
  'audio/ogg': 'consulta.ogg',
  'image/jpeg': 'consulta.jpg',
};

const fileName = (file: Blob) => FILE_NAME[file.type.split(';')[0] ?? ''] ?? 'consulta';

/**
 * Webhook "Lois Consulta web" de n8n (contrato en docs/n8n.md). Manda el token de la sesión
 * para que n8n verifique que es un usuario de la web.
 */
export function createN8nMedia(url: string, getToken: () => Promise<string | null>): MediaPort {
  return {
    async understand(kind: MediaKind, file: Blob) {
      const token = await getToken();
      if (!token) throw new MediaError('unauthorized');

      const body = new FormData();
      body.append('tipo', kind === 'photo' ? 'foto' : 'audio');
      body.append('archivo', file, fileName(file));

      let res: Response;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body,
        });
      } catch {
        throw new MediaError('failed');
      }
      if (res.status === 401 || res.status === 403) throw new MediaError('unauthorized');
      if (res.status === 413) throw new MediaError('too-large');
      if (!res.ok) throw new MediaError('failed');

      const json: unknown = await res.json().catch(() => null);
      return parseUnderstood(json);
    },
  };
}
