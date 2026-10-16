import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/database.types';
import { storagePhoto } from '@/shared/lib/storage-photo';
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
        driveId: r.imagen_drive_id,
        storagePhoto: storagePhoto(client, r.foto),
      }));
    },
    async assignDrivePhoto(articleId, driveId) {
      const { error } = await client.rpc('asignar_imagen_drive', {
        p_articulo_id: articleId,
        p_drive_id: driveId,
      });
      if (error) throw error;
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
    missingPhotos,
    async allMissingPhotos(family) {
      const all: MissingPhotoArticle[] = [];
      for (let offset = 0; ; offset += PAGE) {
        const page = await missingPhotos(family, offset, PAGE);
        all.push(...page);
        if (page.length < PAGE) return all;
      }
    },
    async unmatchedPhotos() {
      const { data, error } = await client
        .from('fotos_sin_match')
        .select('id, drive_id, archivo, candidatos, created_at')
        .eq('resuelto', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map((r) => ({
        id: r.id,
        driveId: r.drive_id,
        file: r.archivo,
        candidates: r.candidatos,
        createdAt: r.created_at,
      }));
    },
    async suggestCodes(texts) {
      const { data, error } = await client.rpc('sugerir_codigos', { p_textos: texts });
      if (error) throw error;
      return data.map((r) => ({
        articleId: r.id,
        code: r.codigo,
        name: r.nombre,
        hasPhoto: r.tiene_foto,
      }));
    },
    async assignPhoto(photoId, articleId) {
      const { error } = await client.rpc('asignar_foto', {
        p_foto_id: photoId,
        p_articulo_id: articleId,
      });
      if (error) throw error;
    },
    async dismissPhoto(photoId) {
      const { error } = await client
        .from('fotos_sin_match')
        .update({ resuelto: true })
        .eq('id', photoId);
      if (error) throw error;
    },
  };
}
