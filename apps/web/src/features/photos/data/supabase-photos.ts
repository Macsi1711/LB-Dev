import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/database.types';
import { storagePhoto, uploadArticlePhoto } from '@/shared/lib/storage-photo';
import type { MissingPhotoArticle, PhotosPort } from '../domain/ports';

const PAGE = 1000; // máximo de filas por pedido de PostgREST

export function createSupabasePhotos(client: SupabaseClient<Database>): PhotosPort {
  async function missingPhotos(family: string | null, offset: number, limit: number) {
    let query = client
      .from('v_articulos_sin_foto')
      .select('id, codigo, nombre, familia_nombre')
      .order('codigo')
      .range(offset, offset + limit - 1);
    if (family) query = query.eq('familia_codigo', family);
    const { data, error } = await query;
    if (error) throw error;
    return data.map((r): MissingPhotoArticle => ({
      id: r.id ?? 0,
      code: r.codigo ?? '',
      name: r.nombre,
      familyName: r.familia_nombre,
    }));
  }

  return {
    async findArticles(q) {
      const { data, error } = await client.rpc('buscar_articulos', { p_q: q, p_limit: 8 });
      if (error) throw error;
      return data.map((r) => ({
        id: r.id ?? 0,
        code: r.codigo ?? '',
        name: r.nombre,
        familyName: r.familia_nombre,
        hasPhoto: r.tiene_foto ?? false,
        storagePhoto: storagePhoto(client, r.foto),
      }));
    },
    async savePhoto(articleId, photo) {
      await uploadArticlePhoto(client, articleId, photo);
    },
    async stats() {
      const { data, error } = await client.rpc('stats_fotos');
      if (error) throw error;
      const stats = data.map((r) => ({
        isTotal: r.es_total,
        familyCode: r.familia_codigo,
        familyName: r.familia_nombre,
        total: Number(r.total),
        withPhoto: Number(r.con_foto),
      }));
      const overall = stats.find((s) => s.isTotal) ?? {
        familyCode: null,
        familyName: null,
        total: 0,
        withPhoto: 0,
      };
      return { overall, families: stats.filter((s) => !s.isTotal) };
    },
    async storageUsage() {
      const { data, error } = await client.rpc('uso_fotos');
      if (error) throw error;
      return { bytes: Number(data[0]?.bytes ?? 0), photos: Number(data[0]?.fotos ?? 0) };
    },
    missingPhotos,
    async allMissingPhotos(family) {
      const all: MissingPhotoArticle[] = [];
      for (let offset = 0; ; offset += PAGE) {
        const page = await missingPhotos(family, offset, PAGE);
        all.push(...page);
        if (page.length < PAGE) return all;
      }
    },
  };
}
