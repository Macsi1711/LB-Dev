import type { MediaKind, Understood } from '../domain/media';
import type { MediaPort } from '../domain/ports';

const ANSWERS: Record<MediaKind, Understood> = {
  audio: { text: 'pastilla onix', heard: '¿Tenés pastillas de freno para el Onix?' },
  photo: { text: 'BUJ-10', heard: 'Etiqueta: BUJ-10 · Bujía iridium' },
};

/** Modo demo: simula el webhook de n8n con una respuesta fija después de un momento. */
export function createDemoMedia(delayMs = 1200): MediaPort {
  return {
    understand: (kind) =>
      new Promise((resolve) => setTimeout(() => resolve(ANSWERS[kind]), delayMs)),
  };
}
