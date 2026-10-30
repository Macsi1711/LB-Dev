import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/database.types';
import { SellersDataError, type SellersPort } from '../domain/ports';

export function createSupabaseSellers(client: SupabaseClient<Database>): SellersPort {
  return {
    async list() {
      const { data, error } = await client.rpc('vendedores_web');
      if (error) throw new SellersDataError(error.message, error.code);
      return data.map((r) => ({
        userId: r.user_id,
        name: r.nombre,
        email: r.email,
        lastSignIn: r.ultimo_ingreso,
      }));
    },
    async resetPassword(userId, password) {
      const { error } = await client.rpc('cambiar_clave_vendedor', {
        p_user_id: userId,
        p_clave: password,
      });
      if (error) throw new SellersDataError(error.message, error.code);
    },
  };
}
