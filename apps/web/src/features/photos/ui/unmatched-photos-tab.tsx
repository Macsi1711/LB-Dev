import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArticleThumbnail } from '@/features/counter';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { candidateList, suggestionTexts, type UnmatchedPhoto } from '../domain/unmatched';
import { usePhotosPort } from './photos-context';

function UnmatchedPhotoCard({ photo }: { photo: UnmatchedPhoto }) {
  const port = usePhotosPort();
  const queryClient = useQueryClient();
  const suggestions = useQuery({
    queryKey: ['sugerencias', photo.id],
    queryFn: () => port.suggestCodes(suggestionTexts(photo)),
  });
  const refresh = () =>
    Promise.all(
      ['fotos-sin-match', 'stats-fotos', 'sin-foto', 'articulos'].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    );
  const assign = useMutation({
    mutationFn: (s: { articleId: number; code: string }) => port.assignPhoto(photo.id, s.articleId),
    onSuccess: (_, s) => {
      toast.success(`Foto asignada a ${s.code}`);
      return refresh();
    },
    onError: () => toast.error('No se pudo asignar la foto.'),
  });
  const dismiss = useMutation({
    mutationFn: () => port.dismissPhoto(photo.id),
    onSuccess: refresh,
    onError: () => toast.error('No se pudo descartar.'),
  });

  return (
    <li className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
      <ArticleThumbnail driveId={photo.driveId} className="rounded-md" />
      <div className="grid min-w-0 content-start gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-mono text-sm break-all">{photo.file ?? 'Sin nombre'}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dismiss.mutate()}
            disabled={dismiss.isPending}
          >
            Descartar
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {candidateList(photo.candidates).map((c) => (
            <Badge key={c} variant="outline">
              {c}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Artículos más parecidos (por código o nombre):
        </p>
        <ul className="grid gap-1">
          {suggestions.data?.map((s) => (
            <li
              key={s.articleId}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border p-2"
            >
              <span className="font-mono font-semibold text-codigo">{s.code}</span>
              <span className="min-w-0 flex-1 basis-40 truncate text-sm">{s.name}</span>
              {s.hasPhoto && <Badge variant="secondary">Ya tiene foto</Badge>}
              <Button size="sm" onClick={() => assign.mutate(s)} disabled={assign.isPending}>
                Asignar a este artículo
              </Button>
            </li>
          ))}
          {suggestions.isSuccess && suggestions.data.length === 0 && (
            <li className="text-sm text-muted-foreground">No hay códigos parecidos.</li>
          )}
        </ul>
      </div>
    </li>
  );
}

export function UnmatchedPhotosTab() {
  const port = usePhotosPort();
  const photos = useQuery({ queryKey: ['fotos-sin-match'], queryFn: () => port.unmatchedPhotos() });

  if (photos.isError) return <p className="text-destructive">No se pudo cargar la lista.</p>;
  if (photos.isSuccess && photos.data.length === 0) {
    return (
      <p className="py-6 text-center text-muted-foreground">No hay fotos pendientes de asignar.</p>
    );
  }
  return (
    <ul className="grid gap-3">
      {photos.data?.map((p) => (
        <UnmatchedPhotoCard key={p.id} photo={p} />
      ))}
    </ul>
  );
}
