import { loadConfig } from './config';
import { getSupabase } from './supabase';

/** Webhook de n8n para audio y foto, con el token de la sesión; null si no está configurado. */
export function getConsultaWebhook() {
  const url = loadConfig(import.meta.env).n8nConsultaUrl;
  if (!url) return null;
  const getToken = async () =>
    (await getSupabase().auth.getSession()).data.session?.access_token ?? null;
  return { url, getToken };
}
