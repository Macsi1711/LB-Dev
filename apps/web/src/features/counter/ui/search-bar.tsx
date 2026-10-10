import { Search, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Input } from '@/shared/ui/input';

const isTyping = (el: Element | null) =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLTextAreaElement ||
  el?.getAttribute('role') === 'combobox';

/** Buscador grande con autofocus. Atajos: "/" enfoca y Esc limpia. */
export function SearchBar(props: { value: string; onChange: (value: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const { onChange } = props;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && !isTyping(document.activeElement)) {
        e.preventDefault();
        input.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === input.current) {
        onChange('');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onChange]);

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={input}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoFocus
        autoComplete="off"
        aria-label="Buscar artículos"
        placeholder="Código, pieza o modelo… ej: pastilla onix"
        value={props.value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 pr-10 pl-10 text-lg md:text-lg [&::-webkit-search-cancel-button]:appearance-none"
      />
      {props.value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            input.current?.focus();
          }}
          className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
          aria-label="Limpiar búsqueda"
        >
          <X className="size-5" />
        </button>
      )}
    </div>
  );
}
