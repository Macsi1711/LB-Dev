import type { Viewer } from '@/shared/roles';

export interface NavItem {
  path: string;
  label: string;
  icon: 'search' | 'image' | 'package' | 'chart';
  viewers: readonly Viewer[];
}

// Sin sesión, el vendedor busca y ve en Fotos cuántas hay; el resto es del admin (ADR-011).
const ITEMS: readonly NavItem[] = [
  { path: '/', label: 'Mostrador', icon: 'search', viewers: ['anonimo', 'vendedor', 'admin'] },
  { path: '/fotos', label: 'Fotos', icon: 'image', viewers: ['anonimo', 'vendedor', 'admin'] },
  { path: '/productos', label: 'Productos', icon: 'package', viewers: ['admin'] },
  { path: '/metricas', label: 'Métricas', icon: 'chart', viewers: ['admin'] },
];

export function navigationFor(viewer: Viewer): NavItem[] {
  return ITEMS.filter((item) => item.viewers.includes(viewer));
}

/** Si quien mira puede entrar a la ruta (o a una subruta de una sección). */
export function canAccess(viewer: Viewer, path: string): boolean {
  const section = ITEMS.filter((i) => i.path !== '/').find(
    (i) => path === i.path || path.startsWith(`${i.path}/`),
  );
  return !section || section.viewers.includes(viewer);
}
