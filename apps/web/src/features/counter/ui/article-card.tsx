import { TriangleAlert } from 'lucide-react';
import type { Article } from '../domain/ports';
import { ArticleThumbnail } from './article-thumbnail';
import { CopyCodeButton } from './copy-code-button';

/** Fila de un resultado dentro de la respuesta del chat. */
export function ArticleCard({
  article,
  onOpen,
}: {
  article: Article;
  onOpen: (a: Article) => void;
}) {
  return (
    <article
      className="flex min-w-0 cursor-pointer items-center gap-3 rounded-md py-2 hover:bg-accent"
      onClick={() => onOpen(article)}
    >
      <ArticleThumbnail
        driveId={article.driveId}
        storagePhoto={article.storagePhoto}
        className="w-20 shrink-0 rounded-md"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="min-w-0 truncate text-left font-mono text-xl font-semibold text-codigo"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(article);
            }}
          >
            {article.code}
          </button>
          {article.notes && (
            <TriangleAlert
              className="size-5 shrink-0 text-aviso"
              aria-label="Tiene observaciones"
            />
          )}
        </div>
        <p className="line-clamp-2 text-sm wrap-anywhere">{article.name}</p>
        {article.familyName && (
          <p className="truncate text-xs text-muted-foreground">{article.familyName}</p>
        )}
      </div>
      <CopyCodeButton code={article.code} />
    </article>
  );
}
