const DRIVE_ID = /\/d\/([A-Za-z0-9_-]+)/;

/** Mismo criterio que la vista `v_articulos.imagen_drive_id`. */
export function extractDriveId(url: string | null): string | null {
  if (!url) return null;
  return DRIVE_ID.exec(url)?.[1] ?? null;
}

/** URLs a probar en orden: si una falla, la tarjeta pasa a la siguiente. */
export function thumbnailCandidates(driveId: string, width = 400): string[] {
  return [
    `https://drive.google.com/thumbnail?id=${driveId}&sz=w${width}`,
    `https://lh3.googleusercontent.com/d/${driveId}=w${width}`,
  ];
}

/** Formato exacto que escribe n8n en `articulos."Imagen"`. No cambiarlo. */
export function driveViewUrl(driveId: string): string {
  return `https://drive.google.com/file/d/${driveId}/view?usp=drivesdk`;
}
