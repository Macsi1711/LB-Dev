export type Theme = 'claro' | 'oscuro';

const KEY = 'tema';

/** Tema actual: el elegido por el usuario o, si no eligió, el del sistema. */
export function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'oscuro' : 'claro';
}

/** Aplica el tema y lo recuerda. index.html lo aplica antes de pintar en la próxima carga. */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'oscuro');
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Modo privado o almacenamiento bloqueado: el tema dura hasta recargar.
  }
}
