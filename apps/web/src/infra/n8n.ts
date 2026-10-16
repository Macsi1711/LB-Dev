import { loadConfig } from './config';
import { getSupabase } from './supabase';

const token = async () =>
  (await getSupabase().auth.getSession()).data.session?.access_token ?? null;

const webhook = (url: string | null) => (url ? { url, getToken: token } : null);

/** Webhook de n8n para audio y foto, con el token de la sesión; null si no está configurado. */
export const getConsultaWebhook = () => webhook(loadConfig(import.meta.env).n8nConsultaUrl);
