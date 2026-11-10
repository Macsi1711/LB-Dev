import type { Viewer } from '@/shared/roles';

export interface NavItem {
  path: string;
  label: string;
  icon: 'search' | 'image' | 'package' | 'chart' | 'users';
  viewers: readonly Viewer[];
}

// Sin sesión no hay nada (ADR-013). El vendedor busca y ve en Fotos cuántas hay; el resto es del
// admin.
const ITEMS: readonly NavItem[] = [
  { path: '/', label: 'Mostrador', icon: 'search', viewers: ['vendedor', 'admin'] },
  { path: '/fotos', label: 'Fotos', icon: 'image', viewers: ['vendedor', 'admin'] },
  { path: '/productos', label: 'Productos', icon: 'package', viewers: ['admin'] },
  { path: '/metricas', label: 'Métricas', icon: 'chart', viewers: ['admin'] },
  { path: '/vendedores', label: 'Vendedores', icon: 'users', viewers: ['admin'] },
];

export function navigationFor(viewer: Viewer): NavItem[] {
  return ITEMS.filter((item) => item.viewers.includes(viewer));
}

/** Si quien mira puede entrar a la ruta (o a una subruta de una sección; lo demás es el Mostrador). */
export function canAccess(viewer: Viewer, path: string): boolean {
  const section =
    ITEMS.find((i) => i.path !== '/' && (path === i.path || path.startsWith(`${i.path}/`))) ??
    ITEMS[0]!;
  return section.viewers.includes(viewer);
}
