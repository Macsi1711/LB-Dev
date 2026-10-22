import { useState } from 'react';
import { useAuth } from '@/features/auth';
import { getConsultaWebhook } from '@/infra/n8n';
import { getSupabase } from '@/infra/supabase';
import { isDemo } from '@/shared/lib/demo';
import { createDemoCounter } from './data/demo-counter';
import { createDemoMedia } from './data/demo-media';
import { createN8nMedia } from './data/n8n-media';
import { createSupabaseCounter } from './data/supabase-counter';
import { canUseMedia } from './domain/media';
import type { MediaPort } from './domain/ports';
import { CounterPortContext, MediaPortContext } from './ui/counter-context';
import { CounterPage } from './ui/counter-page';

function createMedia(): MediaPort | null {
  if (isDemo) return createDemoMedia();
  const webhook = getConsultaWebhook();
  return webhook && createN8nMedia(webhook.url, webhook.getToken);
}

/** Composition root del Mostrador. */
export function CounterScreen() {
  const { viewer } = useAuth();
  const [port] = useState(() =>
    isDemo ? createDemoCounter() : createSupabaseCounter(getSupabase()),
  );
  const [media] = useState(createMedia);
  return (
    <CounterPortContext value={port}>
      {/* Sin audio ni foto (null), el chat muestra solo la caja de texto. */}
      <MediaPortContext value={canUseMedia(viewer) ? media : null}>
        <CounterPage />
      </MediaPortContext>
    </CounterPortContext>
  );
}
