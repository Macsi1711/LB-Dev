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

/** Crea un usuario de Auth con su perfil. Solo dentro de una transacción de test. */
export async function crearUsuario(
  tx: pg.Client,
  rol: 'vendedor' | 'admin' = 'vendedor',
): Promise<string> {
  const { rows } = await tx.query<{ id: string }>(
    `insert into auth.users (id, email, aud, role)
     values (gen_random_uuid(), gen_random_uuid() || '@test.local', 'authenticated', 'authenticated')
     returning id`,
  );
  const id = rows[0]!.id;
  await tx.query(
    `insert into public.perfiles (user_id, rol) values ($1, $2)
     on conflict (user_id) do update set rol = excluded.rol`,
    [id, rol],
  );
  return id;
}

/** Desde acá, la transacción corre como ese usuario de la web (rol authenticated + JWT). */
export async function actuarComo(tx: pg.Client, userId: string): Promise<void> {
  await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ sub: userId, role: 'authenticated' }),
  ]);
  await tx.query('set local role authenticated');
}
