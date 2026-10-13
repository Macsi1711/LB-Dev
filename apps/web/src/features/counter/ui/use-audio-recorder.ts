import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_AUDIO_SECONDS, MediaError, pickAudioType } from '../domain/media';

export const canRecordAudio = () =>
  typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

interface Recording {
  recorder: MediaRecorder;
  timer: number;
  send: boolean;
}

/**
 * Graba un audio con el micrófono, como en WhatsApp: se toca para empezar y se manda o se
 * cancela. Corta solo al llegar a MAX_AUDIO_SECONDS y lo manda.
 */
export function useAudioRecorder(props: {
  onDone: (audio: Blob) => void;
  onError: (error: MediaError) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const current = useRef<Recording | null>(null);
  // Los callbacks del último render, para llamarlos desde los eventos del grabador.
  const handlers = useRef(props);
  useEffect(() => {
    handlers.current = props;
  });

  const finish = useCallback((send: boolean) => {
    const r = current.current;
    if (!r || r.recorder.state === 'inactive') return;
    r.send = send;
    r.recorder.stop();
  }, []);

  const start = useCallback(async () => {
    if (current.current) return;
    if (!canRecordAudio()) return handlers.current.onError(new MediaError('no-mic'));
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const denied = e instanceof DOMException && e.name === 'NotAllowedError';
      return handlers.current.onError(new MediaError(denied ? 'mic-denied' : 'no-mic'));
    }

    const type = pickAudioType((t) => MediaRecorder.isTypeSupported(t));
    const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks: Blob[] = [];
    const startedAt = Date.now();
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const r = current.current;
      if (r) window.clearInterval(r.timer);
      stream.getTracks().forEach((t) => t.stop());
      current.current = null;
      setRecording(false);
      setElapsed(0);
      if (r?.send && chunks.length > 0) {
        handlers.current.onDone(
          new Blob(chunks, { type: recorder.mimeType || type || 'audio/webm' }),
        );
      }
    };
    const timer = window.setInterval(() => {
      const seconds = (Date.now() - startedAt) / 1000;
      setElapsed(seconds);
      if (seconds >= MAX_AUDIO_SECONDS) finish(true);
    }, 250);

    current.current = { recorder, timer, send: false };
    recorder.start();
    setRecording(true);
  }, [finish]);

  // Si se va de la pantalla grabando, se descarta y se apaga el micrófono.
  useEffect(() => () => finish(false), [finish]);

  return {
    recording,
    elapsed,
    start,
    send: () => finish(true),
    cancel: () => finish(false),
  };
}
