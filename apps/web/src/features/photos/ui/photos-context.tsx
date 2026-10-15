import { createContext, useContext } from 'react';
import type { PhotosPort, PhotoUploadPort } from '../domain/ports';

export const PhotosPortContext = createContext<PhotosPort | null>(null);

export function usePhotosPort(): PhotosPort {
  const port = useContext(PhotosPortContext);
  if (!port) throw new Error('usePhotosPort se usa dentro de <PhotosScreen>');
  return port;
}

/** null cuando no hay webhook de n8n para subir fotos: no se muestra "Agregar foto". */
export const PhotoUploadContext = createContext<PhotoUploadPort | null>(null);

export const usePhotoUpload = (): PhotoUploadPort | null => useContext(PhotoUploadContext);
