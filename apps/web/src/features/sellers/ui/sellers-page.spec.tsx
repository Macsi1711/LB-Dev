import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SellersDataError, type SellersPort } from '../domain/ports';
import { SellersPortContext } from './sellers-context';
import { SellersPage } from './sellers-page';

function renderPage(resetPassword: SellersPort['resetPassword']) {
  const port: SellersPort = {
    list: async () => [{ userId: 'u1', name: 'Juan', email: 'juan@lois.com', lastSignIn: null }],
    resetPassword,
  };
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SellersPortContext value={port}>
        <SellersPage />
      </SellersPortContext>
    </QueryClientProvider>,
  );
}

async function setPassword(password: string) {
  await userEvent.click(await screen.findByRole('button', { name: 'Cambiar contraseña' }));
  await userEvent.type(screen.getByLabelText('Contraseña nueva'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
}

describe('SellersPage', () => {
  it('lista los vendedores y le cambia la contraseña al elegido', async () => {
    const resetPassword = vi.fn(async () => undefined);
    renderPage(resetPassword);
    expect(await screen.findByText('Juan')).toBeInTheDocument();
    await setPassword('mostrador-2026');
    expect(resetPassword).toHaveBeenCalledWith('u1', 'mostrador-2026');
  });

  it('con una contraseña corta avisa y no llama a la base', async () => {
    const resetPassword = vi.fn(async () => undefined);
    renderPage(resetPassword);
    await setPassword('corta');
    expect(await screen.findByRole('alert')).toHaveTextContent('Usá al menos 8 caracteres.');
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('si la base lo rechaza, muestra el motivo en español', async () => {
    renderPage(async () => {
      throw new SellersDataError('no', 'P0002');
    });
    await setPassword('mostrador-2026');
    expect(await screen.findByRole('alert')).toHaveTextContent('Ese vendedor ya no existe.');
  });
});
