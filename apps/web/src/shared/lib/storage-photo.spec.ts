import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { storagePaths, storagePhoto } from './storage-photo';

describe('storagePaths', () => {
  it('la miniatura está al lado de la foto, con ".mini" antes de la extensión', () => {
    expect(storagePaths('12/AbCdEf12.jpg')).toEqual({
      full: '12/AbCdEf12.jpg',
      mini: '12/AbCdEf12.mini.jpg',
    });
  });
});

describe('storagePhoto', () => {
  const client = {
    storage: {
      from: (bucket: string) => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://x/${bucket}/${path}` } }),
      }),
    },
  } as unknown as SupabaseClient;

  it('arma los links públicos del bucket de fotos', () => {
    expect(storagePhoto(client, '12/AbCdEf12.jpg')).toEqual({
      full: 'https://x/fotos/12/AbCdEf12.jpg',
      mini: 'https://x/fotos/12/AbCdEf12.mini.jpg',
    });
  });

  it('sin foto en Storage no hay links', () => {
    expect(storagePhoto(client, null)).toBeNull();
  });
});
