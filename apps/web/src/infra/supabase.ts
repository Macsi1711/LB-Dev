import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/database.types';
import { loadConfig } from './config';

const config = loadConfig(import.meta.env);

export const supabase = createClient<Database>(config.supabaseUrl, config.supabaseKey);
