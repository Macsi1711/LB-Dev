import { useQuery } from '@tanstack/react-query';
import { useBotPort } from './bot-context';

const DAYS = 30;
const when = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short' });

export function MissingSearchesTab() {
  const port = useBotPort();
  const ranking = useQuery({
    queryKey: ['ranking-sin-resultados', DAYS],
    queryFn: () => port.missingSearches(DAYS),
  });

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        Lo que más se buscó sin encontrar en los últimos {DAYS} días. Es la señal de qué falta en el
        catálogo o qué familia está clasificando mal la IA.
      </p>
      {ranking.isError && <p className="text-destructive">No se pudo cargar el ranking.</p>}
      {ranking.isSuccess && ranking.data.length === 0 && (
        <p className="py-6 text-center text-muted-foreground">
          No hubo búsquedas sin resultados. 🎉
        </p>
      )}
      <ol className="grid gap-2">
        {ranking.data?.map((r, i) => (
          <li key={r.text} className="flex items-center gap-3 rounded-md border bg-card px-3 py-2">
            <span className="w-6 text-right text-sm text-muted-foreground tabular-nums">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate">{r.text}</span>
            <span className="text-xs text-muted-foreground">
              última: {when.format(new Date(r.last))}
            </span>
            <span className="font-semibold tabular-nums">{r.times}×</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
