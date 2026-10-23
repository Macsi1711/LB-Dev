import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import {
  articlePhotoFiles,
  isImage,
  toUploadError,
  uploadErrorMessage,
} from '@/shared/lib/photo-upload';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/shared/ui/command';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Textarea } from '@/shared/ui/textarea';
import {
  canSave,
  CreateProductError,
  createProductErrorMessage,
  EMPTY_PRODUCT,
  productErrors,
  savedAs,
  type NewProduct,
} from '../domain/new-product';
import type { CreatedProduct, Family } from '../domain/ports';
import { useProductsPort } from './products-context';

function Field(props: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={props.htmlFor}>{props.label}</Label>
      {props.children}
      {props.error ? (
        <p className="text-sm text-destructive">{props.error}</p>
      ) : (
        props.hint && <p className="text-xs text-muted-foreground">{props.hint}</p>
      )}
    </div>
  );
}

function FamilyPicker(props: {
  id: string;
  families: Family[];
  value: string;
  invalid: boolean;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = props.families.find((f) => f.code === props.value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={props.id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={props.invalid}
          className="w-full min-w-0 justify-between font-normal"
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? (selected.name ?? selected.code) : 'Elegí la familia…'}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar familia…" />
          <CommandList>
            <CommandEmpty>No hay familias con ese nombre.</CommandEmpty>
            {props.families.map((f) => (
              <CommandItem
                key={f.code}
                value={`${f.name ?? ''} ${f.code}`}
                onSelect={() => {
                  props.onChange(f.code);
                  setOpen(false);
                }}
              >
                <Check className={cn(props.value === f.code ? 'opacity-100' : 'opacity-0')} />
                <span className="truncate">{f.name ?? f.code}</span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">{f.code}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Alta de un producto nuevo (solo admin): datos, familia y, si hay, la foto. */
export function NewProductPage() {
  const port = useProductsPort();
  const queryClient = useQueryClient();
  const ids = useId();
  const input = useRef<HTMLInputElement>(null);
  const [product, setProduct] = useState<NewProduct>(EMPTY_PRODUCT);
  const [photo, setPhoto] = useState<File | null>(null);
  // Los errores se muestran recién después del primer intento de guardar.
  const [tried, setTried] = useState(false);
  const [created, setCreated] = useState<CreatedProduct | null>(null);
  const families = useQuery({
    queryKey: ['familias-de-producto'],
    queryFn: () => port.families(),
    staleTime: 10 * 60_000,
  });

  // La vista previa es un objectURL: se libera al cambiar de foto o al salir.
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const errors = tried ? productErrors(product) : {};
  const stored = savedAs(product);
  const set = (field: keyof NewProduct) => (value: string) =>
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
      await queryClient.invalidateQueries({ queryKey: ['articulos'] });
      await queryClient.invalidateQueries({ queryKey: ['articulos-resumen'] });
      await queryClient.invalidateQueries({ queryKey: ['stats-fotos'] });
      await queryClient.invalidateQueries({ queryKey: ['sin-foto'] });
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
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-3 sm:p-4">
      <h1 className="text-xl font-semibold">Productos</h1>
      <p className="rounded-md border bg-muted p-3 text-sm">
        Cargá un producto nuevo: aparece al instante en el Mostrador y en el bot. Si el código ya
        existe, no se guarda.
      </p>

      {created && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border bg-card p-3">
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
            onChange={(e) => set('code')(e.target.value)}
          />
        </Field>
        <Field
          label="Nombre"
          htmlFor={`${ids}-nombre`}
          error={errors.name}
          hint="Se guarda en mayúsculas, como el resto del catálogo."
        >
          <Input
            id={`${ids}-nombre`}
            autoComplete="off"
            placeholder="Ej.: FILTRO DE ACEITE FIAT CRONOS 1.3"
            aria-invalid={!!errors.name}
            value={product.name}
            onChange={(e) => set('name')(e.target.value)}
          />
        </Field>
        <Field label="Familia" htmlFor={`${ids}-familia`} error={errors.family}>
          <FamilyPicker
            id={`${ids}-familia`}
            families={families.data ?? []}
            value={product.family}
            invalid={!!errors.family}
            onChange={set('family')}
          />
          {families.isError && (
            <p className="text-sm text-destructive">No se pudieron cargar las familias.</p>
          )}
        </Field>
        <Field label="Descripción (opcional)" htmlFor={`${ids}-descripcion`}>
          <Textarea
            id={`${ids}-descripcion`}
            placeholder="Medidas, presentación, compatibilidades…"
            value={product.description}
            onChange={(e) => set('description')(e.target.value)}
          />
        </Field>
        <Field label="Observaciones (opcional)" htmlFor={`${ids}-observaciones`}>
          <Textarea
            id={`${ids}-observaciones`}
            placeholder="Lo que tiene que saber el vendedor: reemplazos, avisos…"
            value={product.notes}
            onChange={(e) => set('notes')(e.target.value)}
          />
        </Field>

        <div className="grid gap-2">
          <Label>Foto (opcional)</Label>
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
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => input.current?.click()}
              disabled={save.isPending}
            >
              <Camera />
              {photo ? 'Cambiar la foto' : 'Sacar o elegir foto'}
            </Button>
            {photo && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPhoto(null)}
                disabled={save.isPending}
              >
                <X />
                Quitar
              </Button>
            )}
          </div>
        </div>

        <Button type="submit" size="lg" className="justify-self-start" disabled={save.isPending}>
          <Check />
          {save.isPending ? 'Guardando…' : 'Guardar producto'}
        </Button>
      </form>
    </div>
  );
}
