import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AuthEvent, AuthPort, Session } from '../domain/ports';
import { AuthProvider } from './auth-context';

function fakePort() {
  let emit: (event: AuthEvent, session: Session | null) => void = () => undefined;
  const port: AuthPort = {
    currentSession: async () => ({ userId: 'u1', email: 'ana@lois.com' }),
    onChange: (listener) => {
      emit = listener;
      return () => undefined;
    },
    signIn: async () => ({ ok: true }),
    signOut: async () => undefined,
    requestPasswordReset: async () => ({ ok: true }),
    updatePassword: async () => ({ ok: true }),
    myProfile: async () => ({ userId: 'u1', name: 'Ana', role: 'vendedor' }),
  };
  return { port, emit: (event: AuthEvent) => emit(event, null) };
}

describe('AuthProvider', () => {
  it('al salir borra lo que quedó en la pestaña: el que entra después no ve el chat del anterior', () => {
    const { port, emit } = fakePort();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider port={port}>
          <p>app</p>
        </AuthProvider>
      </QueryClientProvider>,
    );
    sessionStorage.setItem('mostrador-chat', '[{"text":"pastilla onix"}]');
    act(() => emit('signed-out'));
    expect(sessionStorage.getItem('mostrador-chat')).toBeNull();
  });
});
