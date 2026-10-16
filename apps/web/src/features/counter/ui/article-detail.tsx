import { ExternalLink, TriangleAlert } from 'lucide-react';
import { useMediaQuery } from '@/shared/lib/use-media-query';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { photoLink } from '../domain/photo';
import type { Article } from '../domain/ports';
import { ArticleThumbnail } from './article-thumbnail';
import { CopyCodeButton } from './copy-code-button';

/** Drawer desde abajo en el celular; panel lateral en desktop. */
export function ArticleDetail(props: { article: Article | null; onClose: () => void }) {
  const desktop = useMediaQuery('(min-width: 1024px)');
  const a = props.article;
  const link = a ? photoLink(a.storagePhoto, a.driveId) : null;

  return (
    <Sheet open={!!a} onOpenChange={(open) => !open && props.onClose()}>
      <SheetContent
        side={desktop ? 'right' : 'bottom'}
        className={
          desktop
            ? 'w-full overflow-y-auto sm:max-w-md'
            : 'max-h-[90dvh] overflow-y-auto rounded-t-xl'
        }
      >
        {a && (
          <>
            <SheetHeader className="pb-0">
              <SheetTitle className="font-mono text-3xl font-semibold text-codigo">
                {a.code}
              </SheetTitle>
              <SheetDescription className="text-base text-foreground">{a.name}</SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-4 pb-6">
              <ArticleThumbnail
                driveId={a.driveId}
                storagePhoto={a.storagePhoto}
                width={1000}
                className="rounded-md"
              />
              {a.notes && (
                <div
                  className="flex gap-2 rounded-md border border-aviso bg-aviso/15 p-3"
                  role="note"
                >
                  <TriangleAlert className="size-5 shrink-0 text-aviso" aria-hidden />
                  <p className="text-sm">
                    <span className="font-semibold">Observaciones: </span>
                    {a.notes}
                  </p>
                </div>
              )}
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Familia</dt>
                <dd>
                  {a.familyName ? <Badge variant="secondary">{a.familyName}</Badge> : '—'}
                  {a.familyCode && (
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {a.familyCode}
                    </span>
                  )}
                </dd>
                <dt className="text-muted-foreground">Descripción</dt>
                <dd>{a.description || '—'}</dd>
              </dl>
              <div className="grid gap-2 sm:grid-cols-2">
                <CopyCodeButton code={a.code} label="Copiar código" />
                {a.hasPhoto && link && (
                  <Button variant="outline" asChild>
                    <a href={link} target="_blank" rel="noreferrer">
                      <ExternalLink />
                      Abrir foto
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
