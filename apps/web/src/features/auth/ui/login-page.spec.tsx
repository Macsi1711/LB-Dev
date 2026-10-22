import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { AuthPort } from '../domain/ports';
import { AuthProvider } from './auth-context';
import { LoginPage } from './login-page';

function fakePort(overrides: Partial<AuthPort> = {}): AuthPort {
  return {
    currentSession: async () => null,
    onChange: () => () => undefined,
    signIn: async () => ({ ok: true }),
    signOut: async () => undefined,
    requestPasswordReset: async () => ({ ok: true }),
    updatePassword: async () => ({ ok: true }),
    myProfile: async () => ({ userId: 'u1', name: 'Ana', role: 'vendedor' }),
    ...overrides,
  };
}

function renderLogin(port: AuthPort) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider port={port}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  it('muestra el error de credenciales en español', async () => {
    const signIn = vi.fn(async () => ({ ok: false as const, code: 'invalid_credentials' }));
    renderLogin(fakePort({ signIn }));
    await userEvent.type(screen.getByLabelText('Email'), 'ana@lois.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'mala');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(signIn).toHaveBeenCalledWith('ana@lois.com', 'mala');
    expect(await screen.findByRole('alert')).toHaveTextContent('Email o contraseña incorrectos.');
  });

  it('si se entró sin querer, se vuelve al Mostrador sin iniciar sesión (ADR-010)', async () => {
    renderLogin(fakePort());
    expect(await screen.findByRole('link', { name: 'Volver al Mostrador' })).toHaveAttribute(
      'href',
      '/',
    );
  });
});
