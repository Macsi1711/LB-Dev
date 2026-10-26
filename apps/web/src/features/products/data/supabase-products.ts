import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/database.types';
import { storagePhoto, uploadArticlePhoto } from '@/shared/lib/storage-photo';
import { CreateProductError, createProductErrorReason } from '../domain/new-product';
import type { ProductsPort } from '../domain/ports';

type ArticleRow = Database['public']['Views']['v_articulos']['Row'];

function productError(error: PostgrestError): CreateProductError {
  const reason = createProductErrorReason(error.code);
  return new CreateProductError(reason, reason === 'failed' ? undefined : error.message);
}

const created = (row: ArticleRow) => ({
  id: row.id ?? 0,
  code: row.codigo ?? '',
  name: row.nombre,
});

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
      if (error) throw productError(error);
      return created(data);
    },
    async findArticles(q) {
      const { data, error } = await client.rpc('buscar_articulos', {
        p_q: q,
        p_limit: 20,
        p_offset: 0,
      });
      if (error) throw error;
      return data.map((r) => ({
        id: r.id ?? 0,
        code: r.codigo ?? '',
        name: r.nombre,
        description: r.descripcion,
        notes: r.observaciones,
        familyCode: r.familia_codigo,
        familyName: r.familia_nombre,
        storagePhoto: storagePhoto(client, r.foto),
        hasPhoto: r.tiene_foto ?? false,
      }));
    },
    async update(id, product) {
      const { data, error } = await client.rpc('editar_articulo', {
        p_id: id,
        p_nombre: product.name,
        p_familia: product.family,
        p_descripcion: product.description || undefined,
        p_observaciones: product.notes || undefined,
      });
      if (error) throw productError(error);
      return created(data);
    },
    async remove(id) {
      const { error } = await client.rpc('eliminar_articulo', { p_id: id });
      if (error) throw productError(error);
    },
    savePhoto: (articleId, photo) => uploadArticlePhoto(client, articleId, photo),
  };
}
