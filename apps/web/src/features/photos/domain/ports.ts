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

export interface PhotosPort {
  stats(): Promise<PhotoStats>;
  missingPhotos(
    family: string | null,
    offset: number,
    limit: number,
  ): Promise<MissingPhotoArticle[]>;
  /** Todos, para exportar a CSV. */
  allMissingPhotos(family: string | null): Promise<MissingPhotoArticle[]>;
}
