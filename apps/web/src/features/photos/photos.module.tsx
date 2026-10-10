import { useState } from 'react';
import { getSupabase } from '@/infra/supabase';
import { createSupabasePhotos } from './data/supabase-photos';
import { PhotosPortContext } from './ui/photos-context';
import { PhotosPage } from './ui/photos-page';

/** Composition root de la pantalla Fotos. */
export function PhotosScreen() {
  const [port] = useState(() => createSupabasePhotos(getSupabase()));
  return (
    <PhotosPortContext value={port}>
      <PhotosPage />
    </PhotosPortContext>
  );
}
