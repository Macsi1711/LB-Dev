import { useState } from 'react';
import { getSupabase } from '@/infra/supabase';
import { isDemo } from '@/shared/lib/demo';
import { createDemoBot } from './data/demo-bot';
import { createSupabaseBot } from './data/supabase-bot';
import { BotPortContext } from './ui/bot-context';
import { BotPage } from './ui/bot-page';

/** Composition root de la pantalla del bot. */
export function BotScreen() {
  const [port] = useState(() => (isDemo ? createDemoBot() : createSupabaseBot(getSupabase())));
  return (
    <BotPortContext value={port}>
      <BotPage />
    </BotPortContext>
  );
}
