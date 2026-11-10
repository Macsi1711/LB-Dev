import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { actAs, connect, createUser, errorCode, inTransaction } from './db';

// El admin les cambia la contraseña a los vendedores sin mail de recuperación (ADR-014).
let db: pg.Client;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

const PERMISSION_DENIED = '42501';

/** Si la contraseña de Auth del usuario es `password` (se mira como postgres). */
async function passwordIs(tx: pg.Client, userId: string, password: string) {
  await tx.query('reset role');
  const { rows } = await tx.query<{ ok: boolean }>(
    `select encrypted_password = extensions.crypt($2, encrypted_password) as ok
     from auth.users where id = $1`,
    [userId, password],
  );
  return rows[0]!.ok;
}

describe('cambiar_clave_vendedor', () => {
  it('el admin le pone una contraseña nueva a un vendedor', async () => {
    await inTransaction(db, async (tx) => {
      const seller = await createUser(tx, 'vendedor');
      await actAs(tx, await createUser(tx, 'admin'));
      await tx.query('select cambiar_clave_vendedor($1, $2)', [seller, 'mostrador-2026']);
      expect(await passwordIs(tx, seller, 'mostrador-2026')).toBe(true);
    });
  });

  it('el vendedor no puede cambiar contraseñas, ni sin sesión', async () => {
    await inTransaction(db, async (tx) => {
      const seller = await createUser(tx, 'vendedor');
      await actAs(tx, await createUser(tx, 'vendedor'));
      const sql = 'select cambiar_clave_vendedor($1, $2)';
      expect(await errorCode(tx, sql, [seller, 'mostrador-2026'])).toBe(PERMISSION_DENIED);
      await tx.query('set local role anon');
      expect(await errorCode(tx, sql, [seller, 'mostrador-2026'])).toBe(PERMISSION_DENIED);
    });
  });

  it('no toca la contraseña de otro admin', async () => {
    await inTransaction(db, async (tx) => {
      const otherAdmin = await createUser(tx, 'admin');
      await actAs(tx, await createUser(tx, 'admin'));
      expect(
        await errorCode(tx, 'select cambiar_clave_vendedor($1, $2)', [otherAdmin, 'otra-clave-1']),
      ).toBe('P0002');
    });
  });

  it('pide al menos 8 caracteres', async () => {
    await inTransaction(db, async (tx) => {
      const seller = await createUser(tx, 'vendedor');
      await actAs(tx, await createUser(tx, 'admin'));
      expect(await errorCode(tx, 'select cambiar_clave_vendedor($1, $2)', [seller, 'corta'])).toBe(
        '22023',
      );
    });
  });
});

describe('vendedores_web', () => {
  it('al admin le lista los vendedores con su email, sin los admins', async () => {
    await inTransaction(db, async (tx) => {
      const seller = await createUser(tx, 'vendedor');
      const admin = await createUser(tx, 'admin');
      await actAs(tx, admin);
      const { rows } = await tx.query<{ user_id: string; email: string }>(
        'select user_id, email from vendedores_web()',
      );
      const ids = rows.map((r) => r.user_id);
      expect(ids).toContain(seller);
      expect(ids).not.toContain(admin);
      expect(rows.find((r) => r.user_id === seller)!.email).toMatch(/@test\.local$/);
    });
  });

  it('el vendedor no ve la lista', async () => {
    await inTransaction(db, async (tx) => {
      await actAs(tx, await createUser(tx, 'vendedor'));
      expect(await errorCode(tx, 'select * from vendedores_web()')).toBe(PERMISSION_DENIED);
    });
  });
});
