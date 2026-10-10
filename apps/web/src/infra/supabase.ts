import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/database.types';
import { loadConfig } from './config';

let client: SupabaseClient<Database> | null = null;

/** Cliente de Supabase, creado recién cuando se usa (en el modo demo no se crea nunca). */
export function getSupabase(): SupabaseClient<Database> {
  if (!client) {
    const config = loadConfig(import.meta.env);
    client = createClient<Database>(config.supabaseUrl, config.supabaseKey);
  }
  return client;
}
