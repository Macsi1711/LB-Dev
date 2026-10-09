import { supabase } from '@/infra/supabase';
import { createSupabaseBot } from './data/supabase-bot';
import { BotPortContext } from './ui/bot-context';
import { BotPage } from './ui/bot-page';

const port = createSupabaseBot(supabase);

/** Composition root de la pantalla del bot. */
export function BotScreen() {
  return (
    <BotPortContext value={port}>
      <BotPage />
    </BotPortContext>
  );
}
