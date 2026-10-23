import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/database.types';
import { uploadArticlePhoto } from '@/shared/lib/storage-photo';
import { CreateProductError, createProductErrorReason } from '../domain/new-product';
import type { ProductsPort } from '../domain/ports';

export function createSupabaseProducts(client: SupabaseClient<Database>): ProductsPort {
  return {
    async families() {
      const { data, error } = await client
        .from('v_familias')
        .select('codigo, nombre')
        .eq('es_producto', true)
        .order('nombre');
      if (error) throw error;
      return data.flatMap((f) => (f.codigo ? [{ code: f.codigo, name: f.nombre }] : []));
    },
    async create(product) {
      const { data, error } = await client.rpc('crear_articulo', {
        p_codigo: product.code,
        p_nombre: product.name,
        p_familia: product.family,
        p_descripcion: product.description || undefined,
        p_observaciones: product.notes || undefined,
      });
      if (error) {
        const reason = createProductErrorReason(error.code);
        throw new CreateProductError(reason, reason === 'failed' ? undefined : error.message);
      }
      return { id: data.id ?? 0, code: data.codigo ?? '', name: data.nombre };
    },
    savePhoto: (articleId, photo) => uploadArticlePhoto(client, articleId, photo),
  };
}
