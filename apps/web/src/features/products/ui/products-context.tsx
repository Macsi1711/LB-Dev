import { createContext, useContext } from 'react';
import type { ProductsPort } from '../domain/ports';

export const ProductsPortContext = createContext<ProductsPort | null>(null);

export function useProductsPort(): ProductsPort {
  const port = useContext(ProductsPortContext);
  if (!port) throw new Error('useProductsPort se usa dentro de <ProductsScreen>');
  return port;
}
