import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Search, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import { ArticleThumbnail } from '@/features/counter';
import { articlePhotoFiles, toUploadError, uploadErrorMessage } from '@/shared/lib/photo-upload';
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
import {
  canSave,
  CreateProductError,
  createProductErrorMessage,
  productErrors,
  productFromArticle,
  type NewProduct,
} from '../domain/new-product';
import type { EditableArticle } from '../domain/ports';
import { ProductFields, refreshArticles } from './product-fields';
import { useProductsPort } from './products-context';

const toProductError = (e: unknown) =>
  e instanceof CreateProductError ? e : new CreateProductError('failed');

function ArticlePicker({ onPick }: { onPick: (a: EditableArticle) => void }) {
  const port = useProductsPort();
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const results = useQuery({
    queryKey: ['productos-busqueda', q],
    queryFn: () => port.findArticles(q),
    enabled: q !== '',
  });

  return (
    <div className="grid max-w-xl gap-2">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(draft.trim());
        }}
      >
        <Input
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
          </button>
        ))}
      </div>
    </div>
  );
}

/** Corregir los datos de un artículo o sacarlo del catálogo (solo admin). El código no cambia. */
export function EditProductTab() {
  const port = useProductsPort();
  const queryClient = useQueryClient();
  const ids = useId();
  const [target, setTarget] = useState<EditableArticle | null>(null);
  const [product, setProduct] = useState<NewProduct | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  // Los errores se muestran recién después del primer intento de guardar.
  const [tried, setTried] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const pick = (a: EditableArticle | null) => {
    setTarget(a);
    setProduct(a && productFromArticle(a));
    setPhoto(null);
    setTried(false);
  };
  const set = (field: keyof NewProduct, value: string) =>
    setProduct((p) => p && { ...p, [field]: value });

  const save = useMutation({
    mutationFn: async ({ id, data, file }: { id: number; data: NewProduct; file: File | null }) => {
      const result = await port.update(id, data);
      if (!file) return { result, photoError: null };
      try {
        await port.savePhoto(id, await articlePhotoFiles(file));
        return { result, photoError: null };
      } catch (e) {
        // Los datos ya quedaron guardados: la foto se puede cargar después desde Fotos.
        return { result, photoError: uploadErrorMessage(toUploadError(e).reason) };
      }
    },
    onSuccess: async ({ result, photoError }) => {
      if (photoError) {
        toast.warning(`Se guardó ${result.code}, pero la foto no se subió. ${photoError}`);
      } else {
        toast.success(`Cambios guardados en ${result.code}`);
      }
      pick(null);
      await refreshArticles(queryClient);
    },
    onError: (e) => {
      const error = toProductError(e);
      toast.error(createProductErrorMessage(error.reason, error.detail));
      if (error.reason === 'missing') pick(null);
    },
  });

  const remove = useMutation({
    mutationFn: async (article: EditableArticle) => {
      await port.remove(article.id);
      return article;
    },
    onSuccess: async (article) => {
      toast.success(`Se eliminó ${article.code} del catálogo`);
      pick(null);
      await refreshArticles(queryClient);
    },
    onError: (e) => {
      const error = toProductError(e);
      toast.error(createProductErrorMessage(error.reason, error.detail));
      if (error.reason === 'missing') pick(null);
    },
  });

  if (!target || !product) return <ArticlePicker onPick={pick} />;

  const errors = tried ? productErrors(product) : {};
  const busy = save.isPending || remove.isPending;
  const submit = () => {
    setTried(true);
    if (canSave(product)) save.mutate({ id: target.id, data: product, file: photo });
  };

  return (
    <form
      noValidate
      className="grid max-w-xl gap-4 pb-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex items-center gap-3 rounded-md border bg-card p-2">
        <ArticleThumbnail storagePhoto={target.storagePhoto} className="w-20 shrink-0 rounded" />
        <div className="min-w-0 flex-1">
          <p className="font-mono font-semibold text-codigo">{target.code}</p>
          <p className="text-xs text-muted-foreground">
            El código no se cambia: lo usan las fotos, la búsqueda y el historial.
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={() => pick(null)} disabled={busy}>
          Cambiar
        </Button>
      </div>

      <ProductFields
        ids={ids}
        product={product}
        errors={errors}
        onChange={set}
        photo={photo}
        onPhoto={setPhoto}
        currentPhoto={target.storagePhoto?.full}
        busy={busy}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={busy}>
          <Check />
          {save.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="text-destructive"
          onClick={() => setConfirming(true)}
          disabled={busy}
        >
          <Trash2 />
          Eliminar producto
        </Button>
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar {target.code}?</DialogTitle>
            <DialogDescription>
              Deja de aparecer en el Mostrador y en el bot. Queda una copia guardada en la base por
              si hay que recuperarlo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirming(false);
                remove.mutate(target);
              }}
            >
              <Trash2 />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
