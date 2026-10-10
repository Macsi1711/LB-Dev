import type { ReactNode } from 'react';
import { supabase } from '@/infra/supabase';
import { createSupabaseAuth } from './data/supabase-auth';
import { AuthProvider } from './ui/auth-context';

const port = createSupabaseAuth(supabase);

/** Composition root de auth: conecta el cliente de Supabase con el puerto. */
export function AuthModule({ children }: { children: ReactNode }) {
  return <AuthProvider port={port}>{children}</AuthProvider>;
}
