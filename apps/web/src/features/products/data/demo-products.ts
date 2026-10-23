import { demoArticles, demoFamilies } from '@/shared/demo/catalog';
import { CreateProductError, savedAs } from '../domain/new-product';
import type { ProductsPort } from '../domain/ports';

const compact = (code: string) => code.toLowerCase().replace(/[^a-z0-9]+/g, '');

/** En el demo el producto nuevo se suma al catálogo de ejemplo: aparece en el Mostrador. */
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
    async savePhoto(articleId) {
      const article = demoArticles.find((a) => a.id === articleId);
      if (!article) throw new Error('El artículo no existe');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      article.photo =
        demoArticles.find((a) => a.photo && a.family === article.family)?.photo ?? null;
    },
  };
}
