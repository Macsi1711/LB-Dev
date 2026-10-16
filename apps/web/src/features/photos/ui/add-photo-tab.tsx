import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Check, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArticleThumbnail } from '@/features/counter';
import { shrinkPhoto } from '@/shared/lib/shrink-photo';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import type { UploadTarget } from '../domain/ports';
import { isImage, toUploadError, UploadError, uploadErrorMessage } from '../domain/upload';
import { usePhotosPort } from './photos-context';

function ArticlePicker({ onPick }: { onPick: (a: UploadTarget) => void }) {
  const port = usePhotosPort();
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const results = useQuery({
    queryKey: ['agregar-foto-busqueda', q],
    queryFn: () => port.findArticles(q),
    enabled: q !== '',
  });

  return (
    <div className="grid gap-2">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(draft.trim());
        }}
      >
        <Input
          autoFocus
          aria-label="Buscar el artículo"
          placeholder="Código o nombre del artículo…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button type="submit" disabled={!draft.trim()}>
          <Search />
          Buscar
        </Button>
      </form>
      {results.isError && <p className="text-destructive">No se pudo buscar.</p>}
      {results.isSuccess && results.data.length === 0 && (
        <p className="text-sm text-muted-foreground">No encontré artículos con «{q}».</p>
      )}
      <div className="grid gap-1">
        {results.data?.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onPick(a)}
            className="flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-left hover:bg-accent"
          >
            <span className="font-mono font-semibold text-codigo">{a.code}</span>
            <span className="min-w-0 flex-1 truncate text-sm">{a.name}</span>
            {a.hasPhoto && <Badge variant="secondary">Tiene foto</Badge>}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Lado mayor de la foto y de la miniatura que se suben a Storage (ADR-008). */
const FULL_SIDE = 800;
const MINI_SIDE = 320;

/** Elegir un artículo, sacarle o elegir una foto y guardarla en Supabase Storage (ADR-008). */
export function AddPhotoTab(props: {
  target: UploadTarget | null;
  onTargetChange: (target: UploadTarget | null) => void;
}) {
  const port = usePhotosPort();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [confirming, setConfirming] = useState(false);
  const { target, onTargetChange } = props;

  // La vista previa es un objectURL: se libera al cambiar de foto o al salir.
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const save = useMutation({
    mutationFn: async ({ article, file }: { article: UploadTarget; file: File }) => {
      let full: Blob;
      let mini: Blob;
      try {
        [full, mini] = await Promise.all([
          shrinkPhoto(file, FULL_SIDE),
          shrinkPhoto(file, MINI_SIDE),
        ]);
      } catch {
        throw new UploadError('not-image');
      }
      await port.savePhoto(article.id, { full, mini });
      return article;
    },
    onSuccess: async (article) => {
      toast.success(`Foto guardada en ${article.code}`);
      setPhoto(null);
      onTargetChange(null);
      await queryClient.invalidateQueries({ queryKey: ['stats-fotos'] });
      await queryClient.invalidateQueries({ queryKey: ['sin-foto'] });
      await queryClient.invalidateQueries({ queryKey: ['articulos'] });
    },
    onError: (e) => toast.error(uploadErrorMessage(toUploadError(e).reason)),
  });

  const submit = () => {
    if (target && photo) save.mutate({ article: target, file: photo });
  };

  return (
    <div className="grid max-w-xl gap-5">
      <section className="grid gap-2">
        <h2 className="font-semibold">1. Elegí el artículo</h2>
        {target ? (
          <div className="flex items-center gap-3 rounded-md border bg-card p-2">
            <ArticleThumbnail
              driveId={target.driveId}
              storagePhoto={target.storagePhoto}
              className="w-20 shrink-0 rounded"
            />
            <div className="min-w-0 flex-1">
              <p className="font-mono font-semibold text-codigo">{target.code}</p>
              <p className="truncate text-sm">{target.name}</p>
              {target.hasPhoto && (
                <p className="text-xs text-muted-foreground">Ya tiene foto: la vas a reemplazar.</p>
              )}
            </div>
            <Button variant="ghost" onClick={() => onTargetChange(null)} disabled={save.isPending}>
              Cambiar
            </Button>
          </div>
        ) : (
          <ArticlePicker onPick={onTargetChange} />
        )}
      </section>

      <section className="grid gap-2">
        <h2 className="font-semibold">2. Sacá o elegí la foto</h2>
        {/* Sin capture: el celular ofrece sacar la foto o elegirla de la galería. */}
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            if (!isImage(file)) return void toast.error(uploadErrorMessage('not-image'));
            setPhoto(file);
          }}
        />
        {preview && (
          <img
            src={preview}
            alt="Vista previa de la foto"
            className="max-h-72 w-full rounded-md border object-contain"
          />
        )}
        <Button
          variant="outline"
          className="justify-self-start"
          onClick={() => input.current?.click()}
          disabled={save.isPending}
        >
          <Camera />
          {photo ? 'Cambiar la foto' : 'Sacar o elegir foto'}
        </Button>
      </section>

      <Button
        size="lg"
        className="justify-self-start"
        disabled={!target || !photo || save.isPending}
        onClick={() => (target?.hasPhoto ? setConfirming(true) : submit())}
      >
        <Check />
        {save.isPending ? 'Subiendo…' : 'Guardar foto'}
      </Button>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Reemplazar la foto de {target?.code}?</DialogTitle>
            <DialogDescription>
              La foto anterior no se borra: queda guardada en el historial.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setConfirming(false);
                submit();
              }}
            >
              Reemplazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
