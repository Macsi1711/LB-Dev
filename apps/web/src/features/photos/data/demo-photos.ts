import { demoArticles, demoFamilyName, demoPhoto, isProductFamily } from '@/shared/demo/catalog';
import { normalize } from '@/shared/demo/text';
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
          storagePhoto: demoPhoto(a.photo),
        }));
    },
    // No sube nada: le pone una ilustración de la misma familia para que el artículo muestre algo.
    async savePhoto(articleId) {
      const article = demoArticles.find((a) => a.id === articleId);
      if (!article) throw new Error('El artículo no existe');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const sameFamily = demoArticles.find((a) => a.photo && a.family === article.family);
      article.photo = sameFamily?.photo ?? demoArticles.find((a) => a.photo)?.photo ?? null;
    },
  };
}
