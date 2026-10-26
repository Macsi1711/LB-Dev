export interface Config {
  supabaseUrl: string;
  supabaseKey: string;
  /** Webhook de n8n para consultar con audio y foto (ADR-005). Sin él, el chat es solo texto. */
  n8nConsultaUrl: string | null;
}

type Env = Record<string, string | undefined>;

/** Como URL.canParse, que no existe en Chrome < 120 (el último de Windows 7 es el 109). */
function isUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function required(env: Env, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Falta la variable de entorno ${name} (ver apps/web/.env.example)`);
  return value;
}

function optionalHttpsUrl(env: Env, name: string): string | null {
  const value = env[name]?.trim();
  if (!value) return null;
  if (!isUrl(value)) throw new Error(`${name} no es una URL válida`);
  const { protocol, hostname } = new URL(value);
  const local = hostname === 'localhost' || hostname === '127.0.0.1';
  if (protocol !== 'https:' && !local) throw new Error(`${name} tiene que ser https`);
  return value;
}

function isSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  const payload = key.split('.')[1];
  if (!payload) return false;
  try {
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).role === 'service_role';
  } catch {
    return false;
  }
}

/** Config tipada y validada al arrancar: si algo falta o está mal, la app no levanta. */
export function loadConfig(env: Env): Config {
  const supabaseUrl = required(env, 'VITE_SUPABASE_URL');
  const supabaseKey = required(env, 'VITE_SUPABASE_ANON_KEY');
  if (!isUrl(supabaseUrl)) throw new Error('VITE_SUPABASE_URL no es una URL válida');
  if (isSecretKey(supabaseKey)) {
    throw new Error(
      'VITE_SUPABASE_ANON_KEY es una clave secreta (service_role). En el frontend va la publishable.',
    );
  }
  return {
    supabaseUrl,
    supabaseKey,
    n8nConsultaUrl: optionalHttpsUrl(env, 'VITE_N8N_CONSULTA_URL'),
  };
}
