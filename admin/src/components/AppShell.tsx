import { Button } from '@tremor/react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useSession } from '@/auth/session';

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-tremor-small px-3 py-1.5 text-tremor-default font-medium transition-colors',
    isActive
      ? 'bg-tremor-brand-faint text-tremor-brand-emphasis'
      : 'text-tremor-content hover:text-tremor-content-emphasis',
  ].join(' ');

export function AppShell({ children }: { children: ReactNode }) {
  const { state, signOut } = useSession();
  const alias = state.phase === 'authenticated' ? state.profile?.alias : undefined;

  return (
    <div className="min-h-screen bg-tremor-background-muted">
      <header className="border-b border-tremor-border bg-tremor-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-tremor-title font-semibold text-tremor-content-strong">
              Joinly · Moderación
            </span>
            <nav className="flex items-center gap-1">
              <NavLink to="/reports" className={navClass}>
                Reportes
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {alias && <span className="text-tremor-default text-tremor-content">{alias}</span>}
            <Button variant="secondary" size="xs" onClick={() => void signOut()}>
              Salir
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
