import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/shared/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { useCounterPort } from './counter-context';

function useFamilies() {
  const port = useCounterPort();
  const { data = [] } = useQuery({
    queryKey: ['familias'],
    queryFn: () => port.families(),
    staleTime: 10 * 60_000,
  });
  return data;
}

/** Nombre de la familia para mostrar; si todavía no cargaron, null. */
export function useFamilyName(code: string | null): string | null {
  const families = useFamilies();
  return (code && families.find((f) => f.code === code)?.name) || null;
}

/** Chip que filtra por familia los mensajes que se mandan después. */
export function FamilyFilter(props: {
  value: string | null;
  onChange: (code: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const families = useFamilies();
  const selected = families.find((f) => f.code === props.value);
  const choose = (code: string | null) => {
    props.onChange(code);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={props.value ? 'secondary' : 'outline'}
          role="combobox"
          aria-expanded={open}
          aria-label="Familia"
          className="h-10 max-w-60 min-w-0 shrink-0 justify-between rounded-full"
        >
          <span className="truncate">
            {selected ? (selected.name ?? selected.code) : 'Todas las familias'}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar familia…" />
          <CommandList>
            <CommandEmpty>No hay familias con ese nombre.</CommandEmpty>
            <CommandItem value="todas las familias" onSelect={() => choose(null)}>
              <Check className={cn(props.value ? 'opacity-0' : 'opacity-100')} />
              Todas las familias
            </CommandItem>
            {families.map((f) => (
              <CommandItem
                key={f.code}
                value={`${f.name ?? ''} ${f.code}`}
                onSelect={() => choose(f.code)}
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
