import { fitWithin, MAX_PHOTO_SIDE, MediaError } from '../domain/media';

/**
 * Achica la foto a MAX_PHOTO_SIDE en JPEG antes de mandarla: las del celular pesan varios MB y
 * para leer una etiqueta alcanza. Respeta la orientación de la cámara.
 */
export async function shrinkPhoto(file: Blob): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new MediaError('failed');
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_PHOTO_SIDE);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85),
  );
  if (!blob) throw new MediaError('failed');
  return blob;
}
