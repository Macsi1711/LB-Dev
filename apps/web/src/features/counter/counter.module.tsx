import { supabase } from '@/infra/supabase';
import { createSupabaseCounter } from './data/supabase-counter';
import { CounterPortContext } from './ui/counter-context';
import { CounterPage } from './ui/counter-page';

const port = createSupabaseCounter(supabase);

/** Composition root del Mostrador. */
export function CounterScreen() {
  return (
    <CounterPortContext value={port}>
      <CounterPage />
    </CounterPortContext>
  );
}
