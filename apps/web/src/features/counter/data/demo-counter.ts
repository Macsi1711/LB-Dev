import {
  demoArticles,
  demoFamilies,
  demoFamilyName,
  type DemoArticle,
} from '@/shared/demo/catalog';
import { searchTerms, termMatches } from '@/shared/demo/search';
import { normalize, similarity } from '@/shared/demo/text';
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

const textOf = (a: DemoArticle) => normalize([a.code, a.name, a.description, a.notes].join(' '));

const withFilters = (state: SearchState) =>
  demoArticles
    .filter((a) => !state.family || a.family === state.family)
    .filter((a) => !state.withPhoto || !!a.photo);

/** Mismo criterio que buscar_articulos(): todos los términos, código exacto primero. */
function strict(state: SearchState): DemoArticle[] {
  const code = state.q.trim().toUpperCase();
  const terms = searchTerms(state.q);
  return withFilters(state)
    .filter((a) => a.code.toUpperCase() === code || terms.every((t) => textOf(a).includes(t)))
    .sort(
      (a, b) =>
        Number(b.code.toUpperCase() === code) - Number(a.code.toUpperCase() === code) ||
        Number(!!code && b.code.toUpperCase().startsWith(code)) -
          Number(!!code && a.code.toUpperCase().startsWith(code)) ||
        a.name.localeCompare(b.name),
    );
}

/** Como puntuar_parecidos(): los que comparten más términos, con tolerancia a errores de tipeo. */
function closest(state: SearchState): DemoArticle[] {
  const terms = searchTerms(state.q);
  if (terms.length === 0) return [];
  const scored = withFilters(state).map((a) => ({
    a,
    hits: terms.filter((t) => termMatches(t, textOf(a))).length,
  }));
  const best = Math.max(0, ...scored.map((s) => s.hits));
  if (best < Math.max(1, terms.length - 1)) return [];
  return scored
    .filter((s) => s.hits === best)
    .map((s) => s.a)
    .sort((a, b) => similarity(state.q, b.name) - similarity(state.q, a.name));
}

function results(state: SearchState) {
  const exact = strict(state);
  if (exact.length > 0 || !state.q.trim()) return { list: exact, approximate: false };
  const list = closest(state);
  return { list, approximate: list.length > 0 };
}

export function createDemoCounter(): CounterPort {
  return {
    search: async (state, offset, limit) =>
      results(state)
        .list.slice(offset, offset + limit)
        .map(toArticle),
    summary: async (state) => {
      const { list, approximate } = results(state);
      return { total: list.length, approximate };
    },
    families: async () =>
      demoFamilies.filter((f) => f.isProduct).map((f) => ({ code: f.code, name: f.name })),
  };
}
