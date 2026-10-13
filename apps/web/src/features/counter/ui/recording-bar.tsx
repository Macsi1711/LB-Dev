import { SendHorizontal } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { formatDuration, MAX_AUDIO_SECONDS } from '../domain/media';

/** Reemplaza a la caja de texto mientras se graba un audio. */
export function RecordingBar(props: { elapsed: number; onCancel: () => void; onSend: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full border bg-card ps-4 pe-1">
        <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-destructive" />
        <span className="tabular-nums" role="timer" aria-label="Grabando">
          {formatDuration(props.elapsed)}
          <span className="text-muted-foreground"> / {formatDuration(MAX_AUDIO_SECONDS)}</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          className="ms-auto rounded-full"
          onClick={props.onCancel}
        >
          Cancelar
        </Button>
      </div>
      <Button
        type="button"
        size="icon"
        aria-label="Enviar audio"
        onClick={props.onSend}
        className="size-12 shrink-0 rounded-full bg-naranja text-marca-foreground hover:bg-naranja/90"
      >
        <SendHorizontal className="size-5" />
      </Button>
    </div>
  );
}
