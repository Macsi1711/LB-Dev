export interface UnmatchedPhoto {
  id: number;
  driveId: string | null;
  file: string | null;
  /** Separados por '|', como los arma n8n. */
  candidates: string | null;
  createdAt: string;
}

export interface CodeSuggestion {
  articleId: number;
  code: string;
  name: string | null;
  hasPhoto: boolean;
}

export function candidateList(candidates: string | null): string[] {
  return (candidates ?? '')
    .split('|')
    .map((c) => c.trim())
    .filter(Boolean);
}

/** Textos para buscar códigos parecidos: el nombre del archivo y los candidatos de n8n. */
export function suggestionTexts(photo: Pick<UnmatchedPhoto, 'file' | 'candidates'>): string[] {
  const texts = [photo.file?.trim() ?? '', ...candidateList(photo.candidates)].filter(Boolean);
  return [...new Set(texts)];
}
