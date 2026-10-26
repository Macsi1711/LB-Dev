import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Search } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { articlePhotoFiles, toUploadError, uploadErrorMessage } from '@/shared/lib/photo-upload';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import {
  canSave,
  CreateProductError,
  createProductErrorMessage,
  EMPTY_PRODUCT,
  productErrors,
  savedAs,
  type NewProduct,
} from '../domain/new-product';
import type { CreatedProduct } from '../domain/ports';
import { Field, ProductFields, refreshArticles } from './product-fields';
import { useProductsPort } from './products-context';

/** Alta de un producto nuevo (solo admin): datos, familia y, si hay, la foto. */
export function NewProductTab() {
  const port = useProductsPort();
  const queryClient = useQueryClient();
  const ids = useId();
  const [product, setProduct] = useState<NewProduct>(EMPTY_PRODUCT);
  const [photo, setPhoto] = useState<File | null>(null);
  // Los errores se muestran recién después del primer intento de guardar.
  const [tried, setTried] = useState(false);
  const [created, setCreated] = useState<CreatedProduct | null>(null);

  const errors = tried ? productErrors(product) : {};
  const stored = savedAs(product);
  const set = (field: keyof NewProduct, value: string) =>
    setProduct((p) => ({ ...p, [field]: value }));

  const save = useMutation({
    mutationFn: async ({ data, file }: { data: NewProduct; file: File | null }) => {
      const result = await port.create(data);
      if (!file) return { result, photoError: null };
      try {
        await port.savePhoto(result.id, await articlePhotoFiles(file));
        return { result, photoError: null };
      } catch (e) {
        // El producto ya quedó creado: la foto se puede cargar después desde Fotos.
        return { result, photoError: uploadErrorMessage(toUploadError(e).reason) };
      }
    },
    onSuccess: async ({ result, photoError }) => {
      if (photoError) {
        toast.warning(`Se creó ${result.code}, pero la foto no se subió. ${photoError}`, {
          description: 'Cargala desde Fotos → Agregar foto.',
        });
      } else {
        toast.success(`Producto ${result.code} creado`);
      }
      setCreated(result);
      setProduct(EMPTY_PRODUCT);
      setPhoto(null);
      setTried(false);
      await refreshArticles(queryClient);
    },
    onError: (e) => {
      const error = e instanceof CreateProductError ? e : new CreateProductError('failed');
      toast.error(createProductErrorMessage(error.reason, error.detail));
    },
  });

  const submit = () => {
    setTried(true);
    if (canSave(product)) save.mutate({ data: product, file: photo });
  };

  return (
    <div className="grid gap-4">
      {created && (
        <div className="flex max-w-xl flex-wrap items-center gap-3 rounded-md border bg-card p-3">
          <Check className="text-primary" />
          <p className="min-w-0 flex-1">
            Se creó <span className="font-mono font-semibold text-codigo">{created.code}</span>{' '}
            <span className="text-sm">{created.name}</span>
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/?q=${encodeURIComponent(created.code)}`}>
              <Search />
              Ver en el Mostrador
            </Link>
          </Button>
        </div>
      )}

      <form
        noValidate
        className="grid max-w-xl gap-4 pb-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field
          label="Código"
          htmlFor={`${ids}-codigo`}
          error={errors.code}
          hint={stored.code ? `Se guarda como ${stored.code}` : undefined}
        >
          <Input
            id={`${ids}-codigo`}
            autoComplete="off"
            autoCapitalize="characters"
            className="font-mono"
            aria-invalid={!!errors.code}
            value={product.code}
            onChange={(e) => set('code', e.target.value)}
          />
        </Field>
        <ProductFields
          ids={ids}
          product={product}
          errors={errors}
          onChange={set}
          photo={photo}
          onPhoto={setPhoto}
          busy={save.isPending}
        />
        <Button type="submit" size="lg" className="justify-self-start" disabled={save.isPending}>
          <Check />
          {save.isPending ? 'Guardando…' : 'Guardar producto'}
        </Button>
      </form>
    </div>
  );
}
