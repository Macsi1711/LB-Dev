import { TriangleAlert } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { type StorageUsage, storageUsage, type UsageLevel } from '../domain/storage-usage';

const number = new Intl.NumberFormat('es-AR');

const BAR: Record<UsageLevel, string> = {
  ok: 'bg-primary',
  warning: 'bg-aviso',
  critical: 'bg-destructive',
};

const ALERT = {
  warning: {
    box: 'border-aviso bg-aviso/15',
    icon: 'text-aviso',
    text: 'Ya se usó más del 70 % del espacio gratis. Conviene ir viendo el plan pago de Supabase.',
  },
  critical: {
    box: 'border-destructive bg-destructive/10',
    icon: 'text-destructive',
    text: 'Queda poco espacio: cuando se llene, no se van a poder cargar más fotos. Hay que pasar al plan pago de Supabase.',
  },
};

export function StorageCard({ usage }: { usage: StorageUsage }) {
  const u = storageUsage(usage);
  const alert = u.level === 'ok' ? null : ALERT[u.level];
  return (
    <section className="grid gap-2 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="espacio-fotos" className="text-sm font-medium text-muted-foreground">
          Espacio para fotos
        </h2>
        <p className="text-sm tabular-nums">{u.text}</p>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-labelledby="espacio-fotos"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={u.percent}
      >
        <div
          className={cn('h-full rounded-full', BAR[u.level])}
          style={{ width: `${Math.min(u.percent, 100)}%` }}
        />
      </div>
      {!!u.remainingPhotos && (
        <p className="text-xs text-muted-foreground tabular-nums">
          Alcanza para unas {number.format(u.remainingPhotos)} fotos más.
        </p>
      )}
      {alert && (
        <div className={cn('flex gap-2 rounded-md border p-3', alert.box)} role="status">
          <TriangleAlert className={cn('size-5 shrink-0', alert.icon)} aria-hidden />
          <p className="text-sm">{alert.text}</p>
        </div>
      )}
    </section>
  );
}
