import { TriangleAlert } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import type { Article } from '../domain/ports';
import { ArticleThumbnail } from './article-thumbnail';
import { CopyCodeButton } from './copy-code-button';

export function ArticleCard({
  article,
  onOpen,
}: {
  article: Article;
  onOpen: (a: Article) => void;
}) {
  return (
    <article
      className="flex cursor-pointer gap-3 rounded-lg border bg-card p-2 text-card-foreground hover:border-ring sm:flex-col"
      onClick={() => onOpen(article)}
    >
      <ArticleThumbnail driveId={article.driveId} className="w-28 shrink-0 rounded-md sm:w-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
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
          <span className="ml-auto">
            <CopyCodeButton code={article.code} />
          </span>
        </div>
        <p className="line-clamp-2 text-sm">{article.name}</p>
        {article.familyName && (
          <Badge variant="secondary" className="max-w-full truncate">
            {article.familyName}
          </Badge>
        )}
      </div>
    </article>
  );
}
