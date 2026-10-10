export interface Config {
  supabaseUrl: string;
  supabaseKey: string;
}

type Env = Record<string, string | undefined>;

function required(env: Env, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Falta la variable de entorno ${name} (ver apps/web/.env.example)`);
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
  if (!URL.canParse(supabaseUrl)) throw new Error('VITE_SUPABASE_URL no es una URL válida');
  if (isSecretKey(supabaseKey)) {
    throw new Error(
      'VITE_SUPABASE_ANON_KEY es una clave secreta (service_role). En el frontend va la publishable.',
    );
  }
  return { supabaseUrl, supabaseKey };
}
