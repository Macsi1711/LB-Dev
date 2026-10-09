import { supabase } from '@/infra/supabase';
import { createSupabasePhotos } from './data/supabase-photos';
import { PhotosPortContext } from './ui/photos-context';
import { PhotosPage } from './ui/photos-page';

const port = createSupabasePhotos(supabase);

/** Composition root de la pantalla Fotos. */
export function PhotosScreen() {
  return (
    <PhotosPortContext value={port}>
      <PhotosPage />
    </PhotosPortContext>
  );
}
