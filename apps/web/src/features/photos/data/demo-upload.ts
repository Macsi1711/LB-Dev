import { demoArticles } from '@/shared/demo/catalog';
import type { PhotoUploadPort } from '../domain/ports';

/** Modo demo: no sube nada; devuelve una foto de ejemplo para que el artículo muestre algo. */
export function createDemoUpload(delayMs = 1000): PhotoUploadPort {
  return {
    upload: (code) =>
      new Promise((resolve) =>
        setTimeout(() => {
          const article = demoArticles.find((a) => a.code === code);
          const sameFamily = demoArticles.find((a) => a.photo && a.family === article?.family);
          resolve(sameFamily?.photo ?? demoArticles.find((a) => a.photo)?.photo ?? 'demo/sin-foto');
        }, delayMs),
      ),
  };
}
