import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/database.types';
import type { Article, CounterPort } from '../domain/ports';
import type { SearchState } from '../domain/search-state';

type ArticleRow = Database['public']['Views']['v_articulos']['Row'];

export function toArticle(row: ArticleRow): Article {
  return {
    id: row.id ?? 0,
    code: row.codigo ?? '',
    name: row.nombre,
    description: row.descripcion,
    notes: row.observaciones?.trim() || null,
    familyCode: row.familia_codigo,
    familyName: row.familia_nombre,
    photoUrl: row.imagen_url,
    driveId: row.imagen_drive_id,
    hasPhoto: row.tiene_foto ?? false,
  };
}

// "Solo con foto" apagado no filtra (null), no busca los que NO tienen foto.
const filters = (state: SearchState) => ({
  p_q: state.q,
  p_familia: state.family ?? undefined,
  p_con_foto: state.withPhoto ? true : undefined,
});

export function createSupabaseCounter(client: SupabaseClient<Database>): CounterPort {
  return {
    async search(state, offset, limit) {
      const { data, error } = await client.rpc('buscar_articulos', {
        ...filters(state),
        p_limit: limit,
        p_offset: offset,
      });
      if (error) throw error;
      return data.map(toArticle);
    },
    async count(state) {
      const { data, error } = await client.rpc('contar_articulos', filters(state));
      if (error) throw error;
      return Number(data);
    },
    async families() {
      const { data, error } = await client
        .from('v_familias')
        .select('codigo, nombre')
        .eq('es_producto', true)
        .order('nombre');
      if (error) throw error;
      // La vista ya descarta los códigos vacíos; el filtro es para el tipo (las vistas son nullable).
      return data.flatMap((f) => (f.codigo ? [{ code: f.codigo, name: f.nombre }] : []));
    },
  };
}
