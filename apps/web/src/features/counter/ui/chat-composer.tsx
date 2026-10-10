import { Camera, SendHorizontal } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { canSend } from '../domain/conversation';
import type { SearchState } from '../domain/search-state';
import { FamilyFilter } from './family-filter';

const isTyping = (el: Element | null) =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLTextAreaElement ||
  el?.getAttribute('role') === 'combobox';

/**
 * Caja para escribir, abajo como en Telegram o WhatsApp. Los filtros quedan puestos para los
 * mensajes que siguen. Atajos: "/" enfoca y Esc borra lo escrito.
 */
export function ChatComposer(props: {
  draft: SearchState;
  onDraftChange: (draft: SearchState) => void;
  onSend: (state: SearchState) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { draft, onDraftChange } = props;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && !isTyping(document.activeElement)) {
        e.preventDefault();
        input.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <form
      className="mx-auto grid w-full max-w-3xl gap-2 px-3 py-2 sm:px-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSend(draft)) return;
        props.onSend(draft);
        onDraftChange({ ...draft, q: '' });
        input.current?.focus();
      }}
    >
      <div className="flex gap-2 overflow-x-auto">
        <FamilyFilter
          value={draft.family}
          onChange={(family) => onDraftChange({ ...draft, family })}
        />
        <Button
          type="button"
          variant={draft.withPhoto ? 'secondary' : 'outline'}
          aria-pressed={draft.withPhoto}
          className="h-10 shrink-0 rounded-full"
          onClick={() => onDraftChange({ ...draft, withPhoto: !draft.withPhoto })}
        >
          <Camera />
          Solo con foto
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Input
          ref={input}
          enterKeyHint="send"
          autoFocus
          autoComplete="off"
          aria-label="Buscar artículos"
          placeholder="Código, pieza o modelo…"
          value={draft.q}
          onChange={(e) => onDraftChange({ ...draft, q: e.target.value })}
          onKeyDown={(e) => e.key === 'Escape' && onDraftChange({ ...draft, q: '' })}
          className="h-12 rounded-full bg-card px-4 text-base md:text-base"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!canSend(draft)}
          aria-label="Enviar"
          className="size-12 shrink-0 rounded-full bg-naranja text-marca-foreground hover:bg-naranja/90"
        >
          <SendHorizontal className="size-5" />
        </Button>
      </div>
    </form>
  );
}
