import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Camera, Mic } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { filterLabels, replySummary, type ChatQuery } from '../domain/conversation';
import type { MediaKind } from '../domain/media';
import type { Article } from '../domain/ports';
import { PAGE_SIZE } from '../domain/search-state';
import { ArticleCard } from './article-card';
import { useCounterPort } from './counter-context';
import { summaryQuery } from './summary-query';
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

const SOURCE = {
  audio: { Icon: Mic, label: 'Audio', working: 'Escuchando el audio…' },
  photo: { Icon: Camera, label: 'Foto', working: 'Leyendo la foto…' },
} satisfies Record<MediaKind, unknown>;

function SourceText({ source, children }: { source?: MediaKind; children: ReactNode }) {
  if (!source) return <p className="break-words">{children}</p>;
  const { Icon, label } = SOURCE[source];
  return (
    <p className="flex items-start gap-1.5 break-words">
      <Icon className="mt-0.5 size-4 shrink-0" aria-label={label} role="img" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

const userBubble =
  'ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground shadow-xs';

export function UserBubble({ query }: { query: ChatQuery }) {
  const familyName = useFamilyName(query.state.family);
  const labels = filterLabels(query.state, familyName);
  return (
    <div className={userBubble}>
      {query.state.q && <SourceText source={query.source}>{query.state.q}</SourceText>}
      {query.heard && (
        <p className="mt-0.5 text-sm break-words text-primary-foreground/80 italic">
          «{query.heard}»
        </p>
      )}
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

function TypingDots({ label = 'Buscando…' }: { label?: string }) {
  return (
    <span className="flex h-6 items-center gap-1" role="status" aria-label={label}>
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

/** Un audio o una foto mientras n8n los pasa a texto. */
export function PendingMediaBubbles({ kind }: { kind: MediaKind }) {
  return (
    <div className="grid gap-3">
      <div className={userBubble}>
        <SourceText source={kind}>{SOURCE[kind].label}</SourceText>
      </div>
      <BotBubble>
        <TypingDots label={SOURCE[kind].working} />
      </BotBubble>
    </div>
  );
}

/** Un aviso del chat, por ejemplo cuando no se entendió un audio. */
export function NoticeBubble({ children }: { children: ReactNode }) {
  return (
    <BotBubble>
      <p role="alert">{children}</p>
    </BotBubble>
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
  const total = useQuery(summaryQuery(port, state));

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
  const count = total.data?.total ?? articles.length;
  const visible = expanded ? articles : articles.slice(0, PREVIEW);
  return (
    <BotBubble className={cn(visible.length > 0 && 'w-full')}>
      <p className="wrap-anywhere">
        {replySummary(count, state, familyName, total.data?.approximate)}
      </p>
      {visible.length > 0 && (
        // grid-cols-1 (minmax(0, 1fr)): un texto largo no estira la lista fuera del cuadro.
        <div className="mt-1 grid grid-cols-1 divide-y">
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
