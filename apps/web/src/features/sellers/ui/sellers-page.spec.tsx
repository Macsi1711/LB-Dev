import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SellersDataError, type SellersPort } from '../domain/ports';
import { SellersPortContext } from './sellers-context';
import { SellersPage } from './sellers-page';

function renderPage(
  resetPassword: SellersPort['resetPassword'],
  list: SellersPort['list'] = async () => [
    { userId: 'u1', name: 'Juan', email: 'juan@lois.com', lastSignIn: null },
  ],
) {
  const port: SellersPort = { list, resetPassword };
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
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
  it('si la lista no carga, lo avisa sin mostrar la tabla vacía', async () => {
    renderPage(vi.fn(), async () => {
      throw new SellersDataError('no existe la función', 'PGRST202');
    });
    expect(await screen.findByText('No se pudo cargar la lista.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

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
