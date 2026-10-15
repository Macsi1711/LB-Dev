import type { CodeSuggestion, UnmatchedPhoto } from './unmatched';

export interface CoverageStat {
  familyCode: string | null;
  familyName: string | null;
  total: number;
  withPhoto: number;
}

export interface PhotoStats {
  overall: CoverageStat;
  /** Solo familias de producto, de menor a mayor cobertura. */
  families: CoverageStat[];
}

export interface MissingPhotoArticle {
  id: number;
  code: string;
  name: string | null;
  familyName: string | null;
}

/** Artículo para elegir al subir una foto. */
export interface UploadTarget {
  id: number;
  code: string;
  name: string | null;
  familyName: string | null;
  hasPhoto: boolean;
  driveId: string | null;
}

export interface PhotosPort {
  stats(): Promise<PhotoStats>;
  missingPhotos(
    family: string | null,
    offset: number,
    limit: number,
  ): Promise<MissingPhotoArticle[]>;
  /** Todos, para exportar a CSV. */
  allMissingPhotos(family: string | null): Promise<MissingPhotoArticle[]>;
  /** Fotos de Drive que n8n no pudo asignar, sin resolver. */
  unmatchedPhotos(): Promise<UnmatchedPhoto[]>;
  suggestCodes(texts: string[]): Promise<CodeSuggestion[]>;
  /** Escribe la foto en el artículo y la marca como resuelta (rpc asignar_foto). */
  assignPhoto(photoId: number, articleId: number): Promise<void>;
  dismissPhoto(photoId: number): Promise<void>;
  /** Busca artículos para asignarles una foto (misma búsqueda que el Mostrador). */
  findArticles(q: string): Promise<UploadTarget[]>;
  /** Escribe en el artículo la foto ya subida a Drive (rpc asignar_imagen_drive). */
  assignDrivePhoto(articleId: number, driveId: string): Promise<void>;
}

/** Sube una foto a Drive y devuelve su id. Falla con UploadError. */
export interface PhotoUploadPort {
  upload(code: string, photo: Blob): Promise<string>;
}
