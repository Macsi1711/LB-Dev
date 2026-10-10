import type { ReactNode } from 'react';
import { useState } from 'react';
import { getSupabase } from '@/infra/supabase';
import { isDemo } from '@/shared/lib/demo';
import { createDemoAuth } from './data/demo-auth';
import { createSupabaseAuth } from './data/supabase-auth';
import { AuthProvider } from './ui/auth-context';

/** Composition root de auth: conecta el cliente de Supabase con el puerto. */
export function AuthModule({ children }: { children: ReactNode }) {
  const [port] = useState(() => (isDemo ? createDemoAuth() : createSupabaseAuth(getSupabase())));
  return <AuthProvider port={port}>{children}</AuthProvider>;
}
