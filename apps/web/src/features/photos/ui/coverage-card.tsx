import { coverageText } from '../domain/coverage';
import type { PhotoStats } from '../domain/ports';

function Bar({ value, total }: { value: number; total: number }) {
  const pct = total ? (value / total) * 100 : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function CoverageCard({ stats }: { stats: PhotoStats }) {
  return (
    <section className="grid gap-3 rounded-lg border bg-card p-4">
      <p className="text-lg font-semibold tabular-nums">{coverageText(stats.overall)}</p>
      <Bar value={stats.overall.withPhoto} total={stats.overall.total} />
      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground">Por familia</summary>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.families.map((f) => (
            <li key={f.familyCode ?? '-'} className="grid gap-1">
              <div className="flex justify-between gap-2 text-sm">
                <span className="truncate">{f.familyName ?? f.familyCode ?? 'Sin familia'}</span>
                <span className="text-muted-foreground tabular-nums">
                  {f.withPhoto}/{f.total}
                </span>
              </div>
              <Bar value={f.withPhoto} total={f.total} />
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
