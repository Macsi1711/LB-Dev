import { ImageOff } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { thumbnailCandidates } from '../domain/drive';

/** Miniatura de Drive con fallback: Drive → googleusercontent → placeholder "Sin foto". */
export function ArticleThumbnail(props: {
  driveId: string | null;
  width?: number;
  className?: string;
}) {
  const urls = props.driveId ? thumbnailCandidates(props.driveId, props.width) : [];
  const [attempt, setAttempt] = useState(0);
  const url = urls[attempt];

  return (
    <div
      className={cn(
        'grid aspect-[4/3] place-items-center overflow-hidden bg-sin-foto',
        props.className,
      )}
    >
      {url ? (
        <img
          key={url}
          src={url}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setAttempt((n) => n + 1)}
          className="size-full object-contain"
        />
      ) : (
        <span className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
          <ImageOff className="size-6" aria-hidden />
          Sin foto
        </span>
      )}
    </div>
  );
}
