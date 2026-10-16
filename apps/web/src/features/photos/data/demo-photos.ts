import { demoArticles, demoFamilyName, isProductFamily } from '@/shared/demo/catalog';
import { demoUnmatchedPhotos } from '@/shared/demo/extras';
import { normalize, similarity } from '@/shared/demo/text';
import type { CoverageStat, MissingPhotoArticle, PhotosPort } from '../domain/ports';

const products = () => demoArticles.filter((a) => isProductFamily(a.family));

const missing = (family: string | null): MissingPhotoArticle[] =>
  products()
    .filter((a) => !a.photo && (!family || a.family === family))
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((a) => ({ id: a.id, code: a.code, name: a.name, familyName: demoFamilyName(a.family) }));

export function createDemoPhotos(): PhotosPort {
  return {
    async stats() {
      const byFamily = new Map<string, CoverageStat>();
      for (const a of products()) {
        const s = byFamily.get(a.family) ?? {
          familyCode: a.family,
          familyName: demoFamilyName(a.family),
          total: 0,
          withPhoto: 0,
        };
        s.total++;
        if (a.photo) s.withPhoto++;
        byFamily.set(a.family, s);
      }
      const families = [...byFamily.values()].sort(
        (a, b) => a.withPhoto / a.total - b.withPhoto / b.total,
      );
      const overall = families.reduce(
        (acc, f) => ({
          ...acc,
          total: acc.total + f.total,
          withPhoto: acc.withPhoto + f.withPhoto,
        }),
        {
          familyCode: null,
          familyName: null,
          total: 0,
          withPhoto: 0,
        } as CoverageStat,
      );
      return { overall, families };
    },
    missingPhotos: async (family, offset, limit) => missing(family).slice(offset, offset + limit),
    allMissingPhotos: async (family) => missing(family),
    unmatchedPhotos: async () =>
      demoUnmatchedPhotos.filter((p) => !p.resolved).map(({ resolved: _r, ...p }) => p),
    async suggestCodes(texts) {
      // Mismo criterio que sugerir_codigos(): por código y, con tope 0,9, por nombre.
      const clean = texts.map((t) =>
        normalize(t.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/_/g, ' ')),
      );
      const nameScore = (text: string, name: string) => {
        const words = text.split(' ').filter(Boolean);
        const coverage = words.filter((w) => name.includes(w)).length / (words.length || 1);
        return 0.9 * ((coverage + similarity(text, name)) / 2);
      };
      return demoArticles
        .map((a) => {
          const code = normalize(a.code);
          const name = normalize(a.name);
          const score = Math.max(
            ...clean.map((t) =>
              Math.max(t.split(' ').includes(code) ? 1 : similarity(code, t), nameScore(t, name)),
            ),
          );
          return { articleId: a.id, code: a.code, name: a.name, hasPhoto: !!a.photo, score };
        })
        .filter((s) => s.score > 0.15)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(({ score: _s, ...s }) => s);
    },
    async assignPhoto(photoId, articleId) {
      const photo = demoUnmatchedPhotos.find((p) => p.id === photoId && !p.resolved);
      const article = demoArticles.find((a) => a.id === articleId);
      if (!photo || !article) throw new Error('La foto o el artículo no existen');
      article.photo = photo.driveId;
      photo.resolved = true;
    },
    async findArticles(q) {
      const words = normalize(q).split(' ').filter(Boolean);
      return demoArticles
        .filter((a) => words.every((w) => normalize(`${a.code} ${a.name}`).includes(w)))
        .slice(0, 8)
        .map((a) => ({
          id: a.id,
          code: a.code,
          name: a.name,
          familyName: demoFamilyName(a.family),
          hasPhoto: !!a.photo,
          driveId: a.photo,
          storagePhoto: null,
        }));
    },
    async assignDrivePhoto(articleId, driveId) {
      const article = demoArticles.find((a) => a.id === articleId);
      if (!article) throw new Error('El artículo no existe');
      article.photo = driveId;
    },
    async dismissPhoto(photoId) {
      const photo = demoUnmatchedPhotos.find((p) => p.id === photoId);
      if (photo) photo.resolved = true;
    },
  };
}
