import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  failedMediaLog,
  queryLog,
  restoreHistory,
  sendQuery,
  type ChatQuery,
  type QueryLog,
} from '../domain/conversation';
import {
  codeNotFoundNotice,
  mediaErrorMessage,
  PHOTO_WITHOUT_CODE,
  photoCode,
  photoFallback,
  toMediaError,
  type MediaError,
  type MediaKind,
} from '../domain/media';
import type { Article } from '../domain/ports';
import { parseSearchState, toSearchParams, type SearchState } from '../domain/search-state';
import { ArticleDetail } from './article-detail';
import { ChatComposer } from './chat-composer';
import {
  NoticeBubble,
  PendingMediaBubbles,
  ReplyBubble,
  UserBubble,
  WelcomeBubble,
} from './chat-messages';
import { useCounterPort, useMediaPort } from './counter-context';
import { summaryQuery } from './summary-query';
import { shrinkPhoto } from '@/shared/lib/shrink-photo';

const STORAGE_KEY = 'mostrador-chat';

// La conversación dura lo que la pestaña: sobrevive a recargar y a ir a otra pantalla.
function loadHistory(): ChatQuery[] {
  try {
    return restoreHistory(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Distancia al final de la página para seguir "pegado" a los mensajes nuevos. */
const STICK_PX = 120;

export function CounterPage() {
  const [params, setParams] = useSearchParams();
  const urlKey = params.toString();
  const [history, setHistory] = useState(loadHistory);
  const [draft, setDraft] = useState<SearchState>(() => ({ ...parseSearchState(params), q: '' }));
  const [selected, setSelected] = useState<Article | null>(null);
  const messages = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const media = useMediaPort();
  const port = useCounterPort();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<MediaKind | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Las métricas no frenan el chat: si no se pudo guardar, la consulta se muestra igual.
  const record = useCallback(
    (log: QueryLog) => void port.record(log).catch(() => undefined),
    [port],
  );

  const send = useCallback(
    (state: SearchState, origin: Pick<ChatQuery, 'source' | 'heard'> = {}) => {
      stick.current = true;
      setNotice(null);
      const next = sendQuery(history, state, { id: newId(), sentAt: Date.now(), ...origin });
      if (next === history) return;
      setHistory(next);
      const sent = next.at(-1);
      // Es el mismo pedido que muestra la respuesta (no se repite): con lo que encontró, la base
      // no vuelve a buscar para las métricas. Si falla, la base cuenta sola.
      if (sent) {
        queryClient.fetchQuery(summaryQuery(port, sent.state)).then(
          (summary) => record(queryLog(sent, summary)),
          () => record(queryLog(sent)),
        );
      }
      // La última consulta queda en la URL para poder compartir el link.
      setParams(toSearchParams(state), { replace: true });
    },
    [history, port, queryClient, record, setParams],
  );

  // Audio o foto: n8n lo pasa a texto y se busca como si se hubiera escrito, con los filtros puestos.
  async function understand(kind: MediaKind, file: Blob) {
    if (!media) return;
    stick.current = true;
    setNotice(null);
    setPending(kind);
    try {
      const upload = kind === 'photo' ? await shrinkPhoto(file) : file;
      const understood = await media.understand(kind, upload);
      const { text, heard } = understood;
      // En una foto se busca solo el código leído: con palabras salen todas las de la familia.
      const code = kind === 'photo' ? photoCode(understood) : null;
      let q = code ?? text;
      let hint = kind === 'photo' && !code ? PHOTO_WITHOUT_CODE : null;
      if (code) {
        // Si el código no está (el de otra marca, por ejemplo), se busca la pieza que se ve.
        const found = await queryClient
          .fetchQuery(summaryQuery(port, { ...draft, q: code }))
          .catch(() => null);
        if (found && (found.total === 0 || found.approximate)) {
          const fallback = photoFallback(understood, code);
          if (fallback) q = fallback;
          hint = codeNotFoundNotice(code, fallback);
        }
      }
      send({ ...draft, q }, heard ? { source: kind, heard } : { source: kind });
      if (hint) setNotice(hint);
    } catch (e) {
      const message = mediaErrorMessage(kind, toMediaError(e).reason);
      setNotice(message);
      record(failedMediaLog(kind, draft, message));
    } finally {
      setPending(null);
    }
  }

  const showError = (kind: MediaKind) => (error: MediaError) => {
    stick.current = true;
    setNotice(mediaErrorMessage(kind, error.reason));
  };

  // Un link compartido (?q=…) llega como un mensaje más; si ya es el último, no se repite.
  const [seenUrl, setSeenUrl] = useState<string | null>(null);
  if (seenUrl !== urlKey) {
    setSeenUrl(urlKey);
    const state = parseSearchState(params);
    setHistory((h) => sendQuery(h, state, { id: newId(), sentAt: Date.now() }));
  }

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Sin almacenamiento (modo privado): la conversación se pierde al recargar.
    }
  }, [history]);

  // Como en un chat: si estás abajo, lo nuevo te lleva al final; si subiste a leer, no.
  useEffect(() => {
    const el = messages.current;
    if (!el) return;
    const toBottom = () => {
      if (stick.current) window.scrollTo({ top: document.documentElement.scrollHeight });
    };
    const onScroll = () => {
      const { scrollHeight } = document.documentElement;
      stick.current = scrollHeight - (window.scrollY + window.innerHeight) < STICK_PX;
    };
    const observer = new ResizeObserver(toBottom);
    observer.observe(el);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <div
        ref={messages}
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-end gap-3 px-3 py-4 sm:px-4"
        aria-live="polite"
      >
        <WelcomeBubble onSend={(q) => send({ ...draft, q })} />
        {history.map((query) => (
          <div key={query.id} className="grid gap-3">
            <UserBubble query={query} />
            <ReplyBubble
              query={query}
              onOpen={setSelected}
              onExpand={() => (stick.current = false)}
            />
          </div>
        ))}
        {pending && <PendingMediaBubbles kind={pending} />}
        {notice && <NoticeBubble>{notice}</NoticeBubble>}
      </div>
      <div className="sticky bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom))] z-30 border-t bg-background/95 backdrop-blur">
        <ChatComposer
          draft={draft}
          onDraftChange={setDraft}
          onSend={send}
          {...(media && {
            onAudio: (audio: Blob) => void understand('audio', audio),
            onPhoto: (photo: File) => void understand('photo', photo),
          })}
          onMediaError={showError('audio')}
          busy={pending !== null}
        />
      </div>
      <ArticleDetail article={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
