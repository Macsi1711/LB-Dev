import {
  demoArticles,
  demoFamilies,
  demoFamilyName,
  type DemoArticle,
} from '@/shared/demo/catalog';
import { normalize } from '@/shared/demo/text';
import { driveViewUrl } from '../domain/drive';
import type { Article, CounterPort } from '../domain/ports';
import type { SearchState } from '../domain/search-state';

const toArticle = (a: DemoArticle): Article => ({
  id: a.id,
  code: a.code,
  name: a.name,
  description: a.description,
  notes: a.notes,
  familyCode: a.family,
  familyName: demoFamilyName(a.family),
  photoUrl: a.photo ? driveViewUrl(a.photo) : null,
  driveId: a.photo,
  hasPhoto: !!a.photo,
});

/** Mismo criterio que buscar_articulos(): todas las palabras, código exacto primero. */
function filter(state: SearchState): DemoArticle[] {
  const q = normalize(state.q);
  const code = state.q.trim().toUpperCase();
  const words = q.split(' ').filter(Boolean);
  return demoArticles
    .filter((a) => !state.family || a.family === state.family)
    .filter((a) => !state.withPhoto || !!a.photo)
    .filter((a) => {
      const text = normalize([a.code, a.name, a.description, a.notes].join(' '));
      return a.code.toUpperCase() === code || words.every((w) => text.includes(w));
    })
    .sort(
      (a, b) =>
        Number(b.code.toUpperCase() === code) - Number(a.code.toUpperCase() === code) ||
        Number(!!code && b.code.toUpperCase().startsWith(code)) -
          Number(!!code && a.code.toUpperCase().startsWith(code)) ||
        a.name.localeCompare(b.name),
    );
}

export function createDemoCounter(): CounterPort {
  return {
    search: async (state, offset, limit) =>
      filter(state)
        .slice(offset, offset + limit)
        .map(toArticle),
    count: async (state) => filter(state).length,
    families: async () =>
      demoFamilies.filter((f) => f.isProduct).map((f) => ({ code: f.code, name: f.name })),
  };
}
