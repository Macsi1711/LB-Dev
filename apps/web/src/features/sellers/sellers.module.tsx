import { useState } from 'react';
import { getSupabase } from '@/infra/supabase';
import { isDemo } from '@/shared/lib/demo';
import { createDemoSellers } from './data/demo-sellers';
import { createSupabaseSellers } from './data/supabase-sellers';
import { SellersPage } from './ui/sellers-page';
import { SellersPortContext } from './ui/sellers-context';

/** Composition root de la sección Vendedores (solo admin). */
export function SellersScreen() {
  const [port] = useState(() =>
    isDemo ? createDemoSellers() : createSupabaseSellers(getSupabase()),
  );
  return (
    <SellersPortContext value={port}>
      <SellersPage />
    </SellersPortContext>
  );
}
