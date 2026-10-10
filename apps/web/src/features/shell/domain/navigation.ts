import type { Role } from '@/shared/roles';

export interface NavItem {
  path: string;
  label: string;
  icon: 'search' | 'image' | 'bot';
  roles: readonly Role[];
}

const ITEMS: readonly NavItem[] = [
  { path: '/', label: 'Mostrador', icon: 'search', roles: ['vendedor', 'admin'] },
  { path: '/fotos', label: 'Fotos', icon: 'image', roles: ['admin'] },
  { path: '/bot', label: 'Bot', icon: 'bot', roles: ['admin'] },
];

export function navigationFor(role: Role): NavItem[] {
  return ITEMS.filter((item) => item.roles.includes(role));
}

/** Si el rol puede entrar a la ruta (o a una subruta de una sección). */
export function canAccess(role: Role, path: string): boolean {
  const section = ITEMS.filter((i) => i.path !== '/').find(
    (i) => path === i.path || path.startsWith(`${i.path}/`),
  );
  return !section || section.roles.includes(role);
}
