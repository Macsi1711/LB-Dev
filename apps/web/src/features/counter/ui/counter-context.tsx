import { createContext, useContext } from 'react';
import type { CounterPort } from '../domain/ports';

export const CounterPortContext = createContext<CounterPort | null>(null);

export function useCounterPort(): CounterPort {
  const port = useContext(CounterPortContext);
  if (!port) throw new Error('useCounterPort se usa dentro de <CounterScreen>');
  return port;
}
