import { useQuery, type QueryClient } from '@tanstack/react-query';
import { Camera, Check, ChevronsUpDown, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { isImage, uploadErrorMessage } from '@/shared/lib/photo-upload';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/shared/ui/command';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Textarea } from '@/shared/ui/textarea';
import type { NewProduct, ProductField } from '../domain/new-product';
import type { Family } from '../domain/ports';
import { useProductsPort } from './products-context';

export function Field(props: {
  label: string;
  htmlFor?: string;
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

export function useProductFamilies() {
  const port = useProductsPort();
  return useQuery({
    queryKey: ['familias-de-producto'],
    queryFn: () => port.families(),
    staleTime: 10 * 60_000,
  });
}

/** Después de crear, editar o eliminar: el Mostrador y Fotos vuelven a pedir los datos. */
export async function refreshArticles(queryClient: QueryClient) {
  for (const key of ['articulos', 'articulos-resumen', 'stats-fotos', 'sin-foto']) {
    await queryClient.invalidateQueries({ queryKey: [key] });
  }
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

/** Nombre, familia, descripción, observaciones y foto: lo mismo para agregar y para editar. */
export function ProductFields(props: {
  ids: string;
  product: NewProduct;
  errors: Partial<Record<ProductField, string>>;
  onChange: (field: keyof NewProduct, value: string) => void;
  photo: File | null;
  onPhoto: (file: File | null) => void;
  /** La foto que ya tiene el artículo (al editar), para mostrarla si no se elige otra. */
  currentPhoto?: string | null;
  busy: boolean;
}) {
  const { ids, product, errors, onChange, photo, onPhoto, busy } = props;
  const families = useProductFamilies();
  const input = useRef<HTMLInputElement>(null);
  // La vista previa es un objectURL: se libera al cambiar de foto o al salir.
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);
  const shown = preview ?? props.currentPhoto ?? null;

  return (
    <>
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
          onChange={(e) => onChange('name', e.target.value)}
        />
      </Field>
      <Field label="Familia" htmlFor={`${ids}-familia`} error={errors.family}>
        <FamilyPicker
          id={`${ids}-familia`}
          families={families.data ?? []}
          value={product.family}
          invalid={!!errors.family}
          onChange={(code) => onChange('family', code)}
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
          onChange={(e) => onChange('description', e.target.value)}
        />
      </Field>
      <Field label="Observaciones (opcional)" htmlFor={`${ids}-observaciones`}>
        <Textarea
          id={`${ids}-observaciones`}
          placeholder="Lo que tiene que saber el vendedor: reemplazos, avisos…"
          value={product.notes}
          onChange={(e) => onChange('notes', e.target.value)}
        />
      </Field>

      <Field label="Foto (opcional)">
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
            onPhoto(file);
          }}
        />
        {shown && (
          <img
            src={shown}
            alt={preview ? 'Vista previa de la foto nueva' : 'Foto actual'}
            className="max-h-72 w-full rounded-md border object-contain"
          />
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => input.current?.click()}
            disabled={busy}
          >
            <Camera />
            {shown ? 'Cambiar la foto' : 'Sacar o elegir foto'}
          </Button>
          {photo && (
            <Button type="button" variant="ghost" onClick={() => onPhoto(null)} disabled={busy}>
              <X />
              Quitar
            </Button>
          )}
        </div>
      </Field>
    </>
  );
}
