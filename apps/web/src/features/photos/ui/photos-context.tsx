import { createContext, useContext } from 'react';
import type { PhotosPort } from '../domain/ports';

export const PhotosPortContext = createContext<PhotosPort | null>(null);

export function usePhotosPort(): PhotosPort {
  const port = useContext(PhotosPortContext);
  if (!port) throw new Error('usePhotosPort se usa dentro de <PhotosScreen>');
  return port;
}
