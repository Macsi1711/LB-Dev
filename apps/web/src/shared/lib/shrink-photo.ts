/** Medidas para achicar una foto sin deformarla; nunca la agranda. */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Achica la foto a `maxSide` en JPEG antes de mandarla: las del celular pesan varios MB. Respeta
 * la orientación de la cámara. Falla si el navegador no puede leer la imagen.
 */
export async function shrinkPhoto(file: Blob, maxSide = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85),
  );
  if (!blob) throw new Error('No se pudo convertir la foto');
  return blob;
}
