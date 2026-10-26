import { useState } from 'react';
import { getSupabase } from '@/infra/supabase';
import { isDemo } from '@/shared/lib/demo';
import { createDemoProducts } from './data/demo-products';
import { createSupabaseProducts } from './data/supabase-products';
import { ProductsPage } from './ui/products-page';
import { ProductsPortContext } from './ui/products-context';

/** Composition root de la sección Productos (solo admin). */
export function ProductsScreen() {
  const [port] = useState(() =>
    isDemo ? createDemoProducts() : createSupabaseProducts(getSupabase()),
  );
  return (
    <ProductsPortContext value={port}>
      <ProductsPage />
    </ProductsPortContext>
  );
}
