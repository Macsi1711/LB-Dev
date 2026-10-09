import type { ReactNode } from 'react';
import { supabase } from '@/infra/supabase';
import { createSupabaseCounter } from './data/supabase-counter';
import { CounterPortContext } from './ui/counter-context';

const port = createSupabaseCounter(supabase);

/** Composition root del Mostrador: provee el puerto conectado a Supabase. */
export function CounterModule({ children }: { children: ReactNode }) {
  return <CounterPortContext value={port}>{children}</CounterPortContext>;
}
