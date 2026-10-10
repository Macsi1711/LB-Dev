import { useQuery } from '@tanstack/react-query';
import { formatPercent } from '../domain/kpis';
import { useBotPort } from './bot-context';

function Kpi({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value ?? '…'}</p>
    </div>
  );
}

export function BotKpis() {
  const port = useBotPort();
  const { data } = useQuery({
    queryKey: ['kpis-bot'],
    queryFn: () => port.kpis(),
    refetchInterval: 60_000,
  });
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Kpi label="Consultas hoy" value={data?.today} />
      <Kpi label="Últimos 7 días" value={data?.week} />
      <Kpi label="Sin resultados (7 días)" value={data && formatPercent(data.noResultsPct)} />
      <Kpi label="Usuarios activos" value={data?.activeUsers} />
    </div>
  );
}
