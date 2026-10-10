import { cn } from '@/shared/lib/utils';

/** Marca de Lois & Bogao en texto (el logo en imagen está Pendiente en DESIGN.md). */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex flex-col leading-none', className)}>
      <span className="text-lg font-extrabold tracking-tight uppercase">
        Lois <span className="text-naranja">&amp;</span> Bogao
      </span>
      <span className="mt-0.5 text-[0.65rem] font-semibold tracking-[0.2em] uppercase opacity-75">
        Mostrador
      </span>
    </span>
  );
}
