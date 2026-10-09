import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/shared/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { useCounterPort } from './counter-context';

export function FamilyFilter(props: {
  value: string | null;
  onChange: (code: string | null) => void;
}) {
  const port = useCounterPort();
  const [open, setOpen] = useState(false);
  const { data: families = [] } = useQuery({
    queryKey: ['familias'],
    queryFn: () => port.families(),
    staleTime: 10 * 60_000,
  });
  const selected = families.find((f) => f.code === props.value);
  const choose = (code: string | null) => {
    props.onChange(code);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="min-w-0 flex-1 justify-between sm:max-w-72"
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
