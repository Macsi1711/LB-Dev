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
    async summary(state) {
      const { data, error } = await client.rpc('resumen_busqueda', filters(state));
      if (error) throw error;
      const row = data[0];
      return { total: Number(row?.total ?? 0), approximate: row?.aproximada ?? false };
    },
    async record(log) {
      const { error } = await client.rpc('registrar_consulta', {
        p_q: log.q ?? '',
        p_familia: log.family ?? undefined,
        p_con_foto: log.withPhoto || undefined,
        p_fuente: log.source,
        p_escuchado: log.heard ?? undefined,
        p_error: log.error ?? undefined,
        // Con la cantidad que ya mostró la web, la base no vuelve a buscar para contar.
        p_cantidad: log.total ?? undefined,
        p_aproximada: log.approximate ?? undefined,
      });
      if (error) throw error;
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
