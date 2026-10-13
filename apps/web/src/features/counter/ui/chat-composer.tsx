import { Camera, Image, Mic, SendHorizontal } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { canSend } from '../domain/conversation';
import type { MediaError } from '../domain/media';
import type { SearchState } from '../domain/search-state';
import { FamilyFilter } from './family-filter';
import { RecordingBar } from './recording-bar';
import { useAudioRecorder } from './use-audio-recorder';

const isTyping = (el: Element | null) =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLTextAreaElement ||
  el?.getAttribute('role') === 'combobox';

const roundButton =
  'size-12 shrink-0 rounded-full bg-naranja text-marca-foreground hover:bg-naranja/90';

/**
 * Caja para escribir, abajo como en Telegram o WhatsApp. Los filtros quedan puestos para los
 * mensajes que siguen. Atajos: "/" enfoca y Esc borra lo escrito. Con la caja vacía, el botón de
 * enviar pasa a ser el micrófono (si hay webhook para audio).
 */
export function ChatComposer(props: {
  draft: SearchState;
  onDraftChange: (draft: SearchState) => void;
  onSend: (state: SearchState) => void;
  /** Sin esto, no se puede mandar audio. */
  onAudio?: (audio: Blob) => void;
  /** Sin esto, no se puede mandar una foto. */
  onPhoto?: (photo: File) => void;
  onMediaError: (error: MediaError) => void;
  /** Mientras se procesa un audio o una foto. */
  busy: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const { draft, onDraftChange, onAudio, onPhoto } = props;
  const recorder = useAudioRecorder({
    onDone: (audio) => onAudio?.(audio),
    onError: props.onMediaError,
  });

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

  // Con una familia elegida y sin texto se puede mandar igual (para recorrer la familia).
  const showMic = !!onAudio && draft.q.trim() === '' && !draft.family;

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
          <Image />
          Solo con foto
        </Button>
      </div>
      {recorder.recording ? (
        <RecordingBar
          elapsed={recorder.elapsed}
          onCancel={recorder.cancel}
          onSend={recorder.send}
        />
      ) : (
        <div className="flex items-center gap-2">
          {onPhoto && (
            <>
              {/* Sin capture: el celular ofrece sacar la foto o elegirla de la galería. */}
              <input
                ref={photoInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) onPhoto(file);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={props.busy}
                aria-label="Mandar una foto"
                onClick={() => photoInput.current?.click()}
                className="size-12 shrink-0 rounded-full"
              >
                <Camera className="size-5" />
              </Button>
            </>
          )}
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
          {showMic ? (
            <Button
              type="button"
              size="icon"
              disabled={props.busy}
              aria-label="Grabar audio"
              onClick={() => void recorder.start()}
              className={roundButton}
            >
              <Mic className="size-5" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!canSend(draft)}
              aria-label="Enviar"
              className={roundButton}
            >
              <SendHorizontal className="size-5" />
            </Button>
          )}
        </div>
      )}
    </form>
  );
}
