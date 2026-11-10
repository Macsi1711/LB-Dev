import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { AuthPort, Session } from '../domain/ports';
import { AuthProvider } from './auth-context';
import { LoginPage } from './login-page';
import { RequireAuth } from './require-auth';

function fakePort(session: Session | null): AuthPort {
  return {
    currentSession: async () => session,
    onChange: () => () => undefined,
    signIn: async () => ({ ok: true }),
    signOut: async () => undefined,
    requestPasswordReset: async () => ({ ok: true }),
    updatePassword: async () => ({ ok: true }),
    myProfile: async () => ({ userId: 'u1', name: 'Ana', role: 'vendedor' }),
  };
}

function renderAt(path: string, session: Session | null) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider port={fakePort(session)}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/" element={<p>Búsqueda del vendedor</p>} />
              <Route path="/fotos" element={<p>Fotos</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('RequireAuth', () => {
  it('sin sesión, el Mostrador manda al login (ADR-013)', async () => {
    renderAt('/', null);
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
    expect(screen.queryByText('Búsqueda del vendedor')).not.toBeInTheDocument();
  });

  it('con sesión, el vendedor entra al Mostrador', async () => {
    renderAt('/', { userId: 'u1', email: 'ana@lois.com' });
    expect(await screen.findByText('Búsqueda del vendedor')).toBeInTheDocument();
  });
});
