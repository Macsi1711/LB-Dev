import { createContext, useContext } from 'react';
import type { SellersPort } from '../domain/ports';

export const SellersPortContext = createContext<SellersPort | null>(null);

export function useSellersPort(): SellersPort {
  const port = useContext(SellersPortContext);
  if (!port) throw new Error('useSellersPort se usa dentro de <SellersScreen>');
  return port;
}
