import { useState } from 'react';
import { getFotosWebhook } from '@/infra/n8n';
import { getSupabase } from '@/infra/supabase';
import { isDemo } from '@/shared/lib/demo';
import { createDemoPhotos } from './data/demo-photos';
import { createDemoUpload } from './data/demo-upload';
import { createN8nUpload } from './data/n8n-upload';
import { createSupabasePhotos } from './data/supabase-photos';
import type { PhotoUploadPort } from './domain/ports';
import { PhotosPortContext, PhotoUploadContext } from './ui/photos-context';
import { PhotosPage } from './ui/photos-page';

function createUpload(): PhotoUploadPort | null {
  if (isDemo) return createDemoUpload();
  const webhook = getFotosWebhook();
  return webhook && createN8nUpload(webhook.url, webhook.getToken);
}

/** Composition root de la pantalla Fotos. */
export function PhotosScreen() {
  const [port] = useState(() =>
    isDemo ? createDemoPhotos() : createSupabasePhotos(getSupabase()),
  );
  const [upload] = useState(createUpload);
  return (
    <PhotosPortContext value={port}>
      <PhotoUploadContext value={upload}>
        <PhotosPage />
      </PhotoUploadContext>
    </PhotosPortContext>
  );
}
