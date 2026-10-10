import pg from 'pg';

/** Postgres del stack local de Supabase (`pnpm db:start`). Nunca apuntar a producción. */
export const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:55422/postgres';

export async function conectar(url = DATABASE_URL): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  return client;
}

/** Corre `fn` en una transacción que siempre se deshace: los tests no dejan datos. */
export async function enTransaccion<T>(
  client: pg.Client,
  fn: (client: pg.Client) => Promise<T>,
): Promise<T> {
  await client.query('begin');
  try {
    return await fn(client);
  } finally {
    await client.query('rollback');
  }
}
