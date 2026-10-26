import { demoArticles, demoFamilies, demoFamilyName, demoPhoto } from '@/shared/demo/catalog';
import { compact, searchTerms, termMatches } from '@/shared/demo/search';
import { CreateProductError, savedAs } from '../domain/new-product';
import type { ProductsPort } from '../domain/ports';

const find = (id: number) => {
  const article = demoArticles.find((a) => a.id === id);
  if (!article) throw new CreateProductError('missing');
  return article;
};

/** En el demo los cambios se hacen sobre el catálogo de ejemplo: se ven en el Mostrador. */
export function createDemoProducts(): ProductsPort {
  return {
    async families() {
      return demoFamilies.filter((f) => f.isProduct).map((f) => ({ code: f.code, name: f.name }));
    },
    async create(product) {
      const { code, name } = savedAs(product);
      const existing = demoArticles.find((a) => compact(a.code) === compact(code));
      if (existing) {
        throw new CreateProductError(
          'duplicate',
          `Ya existe un artículo con el código ${existing.code}`,
        );
      }
      const article = {
        id: Math.max(0, ...demoArticles.map((a) => a.id)) + 1,
        code,
        name,
        description: product.description.trim() || null,
        notes: product.notes.trim() || null,
        family: product.family,
        photo: null,
      };
      demoArticles.push(article);
      return { id: article.id, code, name };
    },
    async findArticles(q) {
      const terms = searchTerms(q);
      return demoArticles
        .filter((a) =>
          terms.every((t) => termMatches(t, `${a.code} ${a.name} ${a.description ?? ''}`)),
        )
        .slice(0, 20)
        .map((a) => ({
          id: a.id,
          code: a.code,
          name: a.name,
          description: a.description,
          notes: a.notes,
          familyCode: a.family,
          familyName: demoFamilyName(a.family),
          storagePhoto: demoPhoto(a.photo),
          hasPhoto: !!a.photo,
        }));
    },
    async update(id, product) {
      const article = find(id);
      article.name = savedAs(product).name;
      article.description = product.description.trim() || null;
      article.notes = product.notes.trim() || null;
      article.family = product.family;
      return { id, code: article.code, name: article.name };
    },
    async remove(id) {
      demoArticles.splice(demoArticles.indexOf(find(id)), 1);
    },
    async savePhoto(articleId) {
      const article = find(articleId);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      article.photo =
        demoArticles.find((a) => a.photo && a.family === article.family)?.photo ?? null;
    },
  };
}
