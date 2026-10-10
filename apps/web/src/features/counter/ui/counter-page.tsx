import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Skeleton } from '@/shared/ui/skeleton';
import { Switch } from '@/shared/ui/switch';
import type { Article } from '../domain/ports';
import {
  emptyResultsMessage,
  PAGE_SIZE,
  parseSearchState,
  toSearchParams,
  type SearchState,
} from '../domain/search-state';
import { ArticleCard } from './article-card';
import { ArticleDetail } from './article-detail';
import { useCounterPort } from './counter-context';
import { FamilyFilter } from './family-filter';
import { SearchBar } from './search-bar';

export function CounterPage() {
  const port = useCounterPort();
  const [params, setParams] = useSearchParams();
  const state = parseSearchState(params);
  const [text, setText] = useState(state.q);
  const debouncedText = useDebouncedValue(text, 250);
  const [selected, setSelected] = useState<Article | null>(null);

  // Forma funcional: siempre parte de la URL vigente, sin cerrar sobre un estado viejo.
  const update = useCallback(
    (patch: Partial<SearchState>) =>
      setParams((prev) => toSearchParams({ ...parseSearchState(prev), ...patch }), {
        replace: true,
      }),
    [setParams],
  );
  useEffect(() => {
    setParams(
      (prev) => {
        const current = parseSearchState(prev);
        if (current.q.trim() === debouncedText.trim()) return prev;
        return toSearchParams({ ...current, q: debouncedText });
      },
      { replace: true },
    );
  }, [debouncedText, setParams]);

  const results = useInfiniteQuery({
    queryKey: ['articulos', state],
    queryFn: ({ pageParam }) => port.search(state, pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.length < PAGE_SIZE ? undefined : pages.length * PAGE_SIZE,
    placeholderData: keepPreviousData,
  });
  const total = useQuery({
    queryKey: ['articulos-total', state],
    queryFn: () => port.count(state),
    placeholderData: keepPreviousData,
  });
  const articles = results.data?.pages.flat() ?? [];

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      <div className="sticky top-0 z-30 -mx-3 flex flex-col gap-2 bg-background px-3 pt-1 pb-2 sm:-mx-4 sm:px-4">
        <SearchBar value={text} onChange={setText} />
        <div className="flex items-center gap-3">
          <FamilyFilter value={state.family} onChange={(family) => update({ family })} />
          <div className="flex items-center gap-2">
            <Switch
              id="solo-foto"
              checked={state.withPhoto}
              onCheckedChange={(withPhoto) => update({ withPhoto })}
            />
            <Label htmlFor="solo-foto" className="whitespace-nowrap">
              Solo con foto
            </Label>
          </div>
        </div>
        {total.data !== undefined && (
          <p className="text-xs text-muted-foreground tabular-nums">
            {total.data.toLocaleString('es-AR')} {total.data === 1 ? 'artículo' : 'artículos'}
          </p>
        )}
      </div>

      {results.isError ? (
        <div className="grid justify-items-center gap-2 py-10 text-center">
          <p>No se pudo buscar. Revisá la conexión.</p>
          <Button variant="outline" onClick={() => void results.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : results.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-32 sm:h-64" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">{emptyResultsMessage(state)}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} onOpen={setSelected} />
            ))}
          </div>
          {results.hasNextPage && (
            <Button
              variant="outline"
              className="mx-auto"
              disabled={results.isFetchingNextPage}
              onClick={() => void results.fetchNextPage()}
            >
              {results.isFetchingNextPage ? 'Cargando…' : `Cargar ${PAGE_SIZE} más`}
            </Button>
          )}
        </>
      )}
      <ArticleDetail article={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
