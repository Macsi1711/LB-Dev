import { useState } from 'react';
import { useAuth } from '@/features/auth';
import { getSupabase } from '@/infra/supabase';
import { isDemo } from '@/shared/lib/demo';
import { createDemoPhotos } from './data/demo-photos';
import { createSupabasePhotos } from './data/supabase-photos';
import { canManagePhotos } from './domain/access';
import { PhotosPortContext } from './ui/photos-context';
import { PhotosPage } from './ui/photos-page';

/** Composition root de la pantalla Fotos. */
export function PhotosScreen() {
  const { viewer } = useAuth();
  const [port] = useState(() =>
    isDemo ? createDemoPhotos() : createSupabasePhotos(getSupabase()),
  );
  return (
    <PhotosPortContext value={port}>
      <PhotosPage canManage={canManagePhotos(viewer)} />
    </PhotosPortContext>
  );
}
