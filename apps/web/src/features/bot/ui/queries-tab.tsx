import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Camera, MessageSquare, Mic } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import {
  UNAUTHORIZED,
  userLabel,
  type BotQuery,
  type QueryFilters,
  type QuerySource,
} from '../domain/queries';
import { useBotPort } from './bot-context';

const PAGE = 50;
const SOURCE_ICON = { texto: MessageSquare, foto: Camera, audio: Mic } as const;
const when = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' });
const selectClass = 'h-9 rounded-md border border-input bg-background px-2 text-sm';

function QueryRow({ q }: { q: BotQuery }) {
  const Icon = q.source ? SOURCE_ICON[q.source] : MessageSquare;
  return (
    <details className="rounded-md border bg-card px-3 py-2">
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="text-xs text-muted-foreground tabular-nums">
          {when.format(new Date(q.createdAt))}
        </span>
        {q.userName ? (
          <span className="font-medium">{q.userName}</span>
        ) : (
          <Badge variant="destructive">{userLabel(q)}</Badge>
        )}
        <Icon className="size-4 text-muted-foreground" aria-label={q.source ?? 'texto'} />
        <span className="min-w-0 flex-1 basis-48">{q.text}</span>
        {q.results !== null && (
          <Badge variant={q.results === 0 ? 'destructive' : 'secondary'} className="tabular-nums">
            {q.results === 0 ? 'sin resultados' : `${q.results} resultados`}
          </Badge>
        )}
        {q.error && <span className="text-xs text-destructive">{q.error}</span>}
      </summary>
      <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 font-mono text-xs whitespace-pre-wrap">
        {q.sql || 'Sin SQL generado.'}
      </pre>
      {q.chatId !== null && (
        <p className="mt-1 font-mono text-xs text-muted-foreground">chat_id {q.chatId}</p>
      )}
    </details>
  );
}

export function QueriesTab() {
  const port = useBotPort();
  const [filters, setFilters] = useState<QueryFilters>({
    onlyNoResults: false,
    user: null,
    source: null,
    from: null,
    to: null,
  });
  const set = (patch: Partial<QueryFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const users = useQuery({ queryKey: ['usuarios-telegram'], queryFn: () => port.telegramUsers() });
  const list = useInfiniteQuery({
    queryKey: ['consultas-bot', filters],
    queryFn: ({ pageParam }) => port.recentQueries(filters, pageParam, PAGE),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length < PAGE ? undefined : pages.length * PAGE),
  });
  const rows = list.data?.pages.flat() ?? [];

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2 self-center">
          <Switch
            id="sin-resultados"
            checked={filters.onlyNoResults}
            onCheckedChange={(onlyNoResults) => set({ onlyNoResults })}
          />
          <Label htmlFor="sin-resultados">Solo sin resultados</Label>
        </div>
        <select
          aria-label="Usuario"
          className={selectClass}
          value={filters.user ?? ''}
          onChange={(e) =>
            set({
              user:
                e.target.value === UNAUTHORIZED
                  ? UNAUTHORIZED
                  : e.target.value
                    ? Number(e.target.value)
                    : null,
            })
          }
        >
          <option value="">Todos los usuarios</option>
          <option value={UNAUTHORIZED}>No autorizados</option>
          {users.data?.map((u) => (
            <option key={u.chatId} value={u.chatId}>
              {u.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Fuente"
          className={selectClass}
          value={filters.source ?? ''}
          onChange={(e) => set({ source: (e.target.value || null) as QuerySource | null })}
        >
          <option value="">Texto, foto y audio</option>
          <option value="texto">Texto</option>
          <option value="foto">Foto</option>
          <option value="audio">Audio</option>
        </select>
        <Label className="grid gap-1 text-xs text-muted-foreground">
          Desde
          <Input
            type="date"
            className="h-9 w-auto"
            value={filters.from ?? ''}
            onChange={(e) => set({ from: e.target.value || null })}
          />
        </Label>
        <Label className="grid gap-1 text-xs text-muted-foreground">
          Hasta
          <Input
            type="date"
            className="h-9 w-auto"
            value={filters.to ?? ''}
            onChange={(e) => set({ to: e.target.value || null })}
          />
        </Label>
      </div>
      {list.isError && <p className="text-destructive">No se pudieron cargar las consultas.</p>}
      {list.isSuccess && rows.length === 0 && (
        <p className="py-6 text-center text-muted-foreground">No hay consultas con esos filtros.</p>
      )}
      <div className="grid gap-2">
        {rows.map((q) => (
          <QueryRow key={q.id} q={q} />
        ))}
      </div>
      {list.hasNextPage && (
        <Button
          variant="outline"
          className="mx-auto"
          onClick={() => void list.fetchNextPage()}
          disabled={list.isFetchingNextPage}
        >
          {list.isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
        </Button>
      )}
    </div>
  );
}
