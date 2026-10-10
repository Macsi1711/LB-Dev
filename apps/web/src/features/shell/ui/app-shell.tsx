import { Bot, Image, LogOut, Moon, Search, Sun } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useAuth } from '@/features/auth';
import { isDemo } from '@/shared/lib/demo';
import { cn } from '@/shared/lib/utils';
import { applyTheme, currentTheme } from '@/shared/lib/theme';
import { Button } from '@/shared/ui/button';
import { navigationFor, type NavItem } from '../domain/navigation';

const ICONS = { search: Search, image: Image, bot: Bot } as const;

function NavLinks({ items, compact }: { items: NavItem[]; compact?: boolean }) {
  return items.map((item) => {
    const Icon = ICONS[item.icon];
    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.path === '/'}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            compact && 'min-h-11 flex-1 flex-col justify-center gap-0.5 px-1 py-1 text-xs',
            isActive && 'bg-accent text-foreground',
          )
        }
      >
        <Icon className="size-5" aria-hidden />
        {item.label}
      </NavLink>
    );
  });
}

function SessionActions() {
  const { port } = useAuth();
  const [theme, setTheme] = useState(currentTheme);
  const toggle = () => {
    const next = theme === 'oscuro' ? 'claro' : 'oscuro';
    applyTheme(next);
    setTheme(next);
  };
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" onClick={toggle} aria-label="Cambiar tema">
        {theme === 'oscuro' ? <Sun /> : <Moon />}
      </Button>
      <Button variant="ghost" size="icon" onClick={() => void port.signOut()} aria-label="Salir">
        <LogOut />
      </Button>
    </div>
  );
}

/** Barra lateral en desktop; barra superior e inferior en el celular. */
export function AppShell() {
  const { profile } = useAuth();
  const items = navigationFor(profile?.role ?? 'vendedor');

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[14rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-4 border-r p-3 lg:flex">
        <p className="px-3 pt-2 font-mono text-sm font-semibold text-primary">MOSTRADOR LOIS</p>
        <nav className="grid gap-1">
          <NavLinks items={items} />
        </nav>
        <div className="mt-auto flex items-center justify-between px-1">
          <span className="truncate text-sm text-muted-foreground">{profile?.name}</span>
          <SessionActions />
        </div>
      </aside>

      <header className="flex items-center justify-between border-b px-4 py-1 lg:hidden">
        <p className="font-mono text-sm font-semibold text-primary">MOSTRADOR LOIS</p>
        <SessionActions />
      </header>

      <main className={cn('min-w-0', items.length > 1 && 'pb-16 lg:pb-0')}>
        {isDemo && (
          <p className="bg-aviso px-4 py-1 text-center text-xs font-medium text-aviso-foreground">
            Modo demo: datos y fotos de ejemplo. Los cambios se pierden al recargar.
          </p>
        )}
        <Outlet />
      </main>

      {items.length > 1 && (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background pb-[env(safe-area-inset-bottom)] lg:hidden">
          <NavLinks items={items} compact />
        </nav>
      )}
    </div>
  );
}
