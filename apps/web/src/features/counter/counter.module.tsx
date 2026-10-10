import { useState } from 'react';
import { getSupabase } from '@/infra/supabase';
import { isDemo } from '@/shared/lib/demo';
import { createDemoCounter } from './data/demo-counter';
import { createSupabaseCounter } from './data/supabase-counter';
import { CounterPortContext } from './ui/counter-context';
import { CounterPage } from './ui/counter-page';

/** Composition root del Mostrador. */
export function CounterScreen() {
  const [port] = useState(() =>
    isDemo ? createDemoCounter() : createSupabaseCounter(getSupabase()),
  );
  return (
    <CounterPortContext value={port}>
      <CounterPage />
    </CounterPortContext>
  );
}
