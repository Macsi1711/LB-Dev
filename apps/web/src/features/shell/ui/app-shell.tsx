import { Bot, Image, LogOut, Moon, Search, Sun } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useAuth } from '@/features/auth';
import { isDemo } from '@/shared/lib/demo';
import { cn } from '@/shared/lib/utils';
import { applyTheme, currentTheme, type Theme } from '@/shared/lib/theme';
import { Button } from '@/shared/ui/button';
import { Wordmark } from '@/shared/ui/wordmark';
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
            compact
              ? 'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 border-t-2 border-transparent px-1 py-1 text-xs font-semibold text-muted-foreground'
              : 'flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-semibold text-marca-muted hover:bg-marca-foreground/10 hover:text-marca-foreground',
            isActive &&
              (compact
                ? 'border-naranja text-primary'
                : 'border-naranja bg-marca-foreground/10 text-marca-foreground'),
          )
        }
      >
        <Icon className="size-5" aria-hidden />
        {item.label}
      </NavLink>
    );
  });
}

// Los botones viven sobre el azul de marca.
const onBrand = 'text-marca-foreground hover:bg-marca-foreground/10 hover:text-marca-foreground';

function SessionActions({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const { port } = useAuth();
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className={onBrand}
        onClick={onToggleTheme}
        aria-label="Cambiar tema"
      >
        {theme === 'oscuro' ? <Sun /> : <Moon />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={onBrand}
        onClick={() => void port.signOut()}
        aria-label="Salir"
      >
        <LogOut />
      </Button>
    </div>
  );
}

/** Barra lateral en desktop; barra superior e inferior en el celular. */
export function AppShell() {
  const { profile } = useAuth();
  const items = navigationFor(profile?.role ?? 'vendedor');
  // Un solo estado de tema para los dos lugares donde está el botón (lateral y header).
  const [theme, setTheme] = useState(currentTheme);
  const toggleTheme = () => {
    const next = theme === 'oscuro' ? 'claro' : 'oscuro';
    applyTheme(next);
    setTheme(next);
  };
  const actions = <SessionActions theme={theme} onToggleTheme={toggleTheme} />;

  return (
    <div
      className={cn(
        'flex min-h-dvh flex-col lg:grid lg:grid-cols-[14rem_1fr]',
        // Alto de la barra inferior del celular; el chat del Mostrador se apoya encima.
        items.length > 1 ? '[--nav-h:3.5rem] lg:[--nav-h:0px]' : '[--nav-h:0px]',
      )}
    >
      <aside className="sticky top-0 hidden h-dvh flex-col gap-4 bg-marca p-3 text-marca-foreground lg:flex">
        <Wordmark className="px-3 pt-3 pb-2" />
        <nav className="grid gap-1">
          <NavLinks items={items} />
        </nav>
        <div className="mt-auto flex items-center justify-between px-1">
          <span className="truncate text-sm text-marca-muted">{profile?.name}</span>
          {actions}
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between bg-marca px-4 py-1.5 text-marca-foreground lg:hidden">
        <Wordmark />
        {actions}
      </header>

      <main className="flex min-w-0 flex-1 flex-col pb-[calc(var(--nav-h)+env(safe-area-inset-bottom))]">
        {isDemo && (
          <p className="bg-aviso px-4 py-1 text-center text-xs font-medium text-aviso-foreground">
            Modo demo: datos y fotos de ejemplo. Los cambios se pierden al recargar.
          </p>
        )}
        <Outlet />
      </main>

      {items.length > 1 && (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(var(--nav-h)+env(safe-area-inset-bottom))] border-t bg-background pb-[env(safe-area-inset-bottom)] lg:hidden">
          <NavLinks items={items} compact />
        </nav>
      )}
    </div>
  );
}
