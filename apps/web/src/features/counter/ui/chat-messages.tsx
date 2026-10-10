import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { filterLabels, replySummary, type ChatQuery } from '../domain/conversation';
import type { Article } from '../domain/ports';
import { PAGE_SIZE } from '../domain/search-state';
import { ArticleCard } from './article-card';
import { useCounterPort } from './counter-context';
import { useFamilyName } from './family-filter';

/** Cuántos resultados entran en la burbuja antes de "Ver todos". */
const PREVIEW = 5;
const EXAMPLES = ['pastilla onix', 'filtro aceite gol', 'bujía'];

const time = (ms: number) =>
  new Date(ms).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

function BotBubble({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'w-fit max-w-[92%] rounded-2xl rounded-bl-sm border bg-card px-3 py-2 text-card-foreground shadow-xs sm:max-w-xl',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function WelcomeBubble({ onSend }: { onSend: (q: string) => void }) {
  return (
    <BotBubble>
      <p>¡Hola! Mandame un código, una pieza o un modelo y te paso lo que hay.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {EXAMPLES.map((q) => (
          <Button
            key={q}
            variant="secondary"
            size="sm"
            className="h-9 rounded-full"
            onClick={() => onSend(q)}
          >
            {q}
          </Button>
        ))}
      </div>
    </BotBubble>
  );
}

export function UserBubble({ query }: { query: ChatQuery }) {
  const familyName = useFamilyName(query.state.family);
  const labels = filterLabels(query.state, familyName);
  return (
    <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground shadow-xs">
      {query.state.q && <p className="break-words">{query.state.q}</p>}
      <div className="mt-0.5 flex flex-wrap items-center justify-end gap-1 text-xs text-primary-foreground/75">
        {labels.map((label) => (
          <span key={label} className="rounded-full bg-primary-foreground/15 px-2 py-0.5">
            {label}
          </span>
        ))}
        <time dateTime={new Date(query.sentAt).toISOString()}>{time(query.sentAt)}</time>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex h-6 items-center gap-1" role="status" aria-label="Buscando…">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-2 animate-bounce rounded-full bg-muted-foreground"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

/** La respuesta a una consulta: cuántos hay y los primeros, con "Ver todos" para el resto. */
export function ReplyBubble(props: {
  query: ChatQuery;
  onOpen: (a: Article) => void;
  onExpand: () => void;
}) {
  const port = useCounterPort();
  const { state } = props.query;
  const familyName = useFamilyName(state.family);
  const [expanded, setExpanded] = useState(false);
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
  });

  if (results.isError)
    return (
      <BotBubble>
        <p>No se pudo buscar. Revisá la conexión.</p>
        <Button variant="outline" className="mt-2" onClick={() => void results.refetch()}>
          Reintentar
        </Button>
      </BotBubble>
    );
  if (results.isPending || total.isPending)
    return (
      <BotBubble>
        <TypingDots />
      </BotBubble>
    );

  const articles = results.data.pages.flat();
  const count = total.data ?? articles.length;
  const visible = expanded ? articles : articles.slice(0, PREVIEW);
  return (
    <BotBubble className={cn(visible.length > 0 && 'w-full')}>
      <p>{replySummary(count, state, familyName)}</p>
      {visible.length > 0 && (
        <div className="mt-1 grid divide-y">
          {visible.map((a) => (
            <ArticleCard key={a.id} article={a} onOpen={props.onOpen} />
          ))}
        </div>
      )}
      {!expanded && articles.length > PREVIEW ? (
        <Button
          variant="ghost"
          className="mt-1 w-full text-primary"
          onClick={() => {
            props.onExpand();
            setExpanded(true);
          }}
        >
          Ver los {count.toLocaleString('es-AR')}
        </Button>
      ) : (
        expanded &&
        results.hasNextPage && (
          <Button
            variant="ghost"
            className="mt-1 w-full text-primary"
            disabled={results.isFetchingNextPage}
            onClick={() => void results.fetchNextPage()}
          >
            {results.isFetchingNextPage ? 'Cargando…' : `Cargar ${PAGE_SIZE} más`}
          </Button>
        )
      )}
    </BotBubble>
  );
}
