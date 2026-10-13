import { createContext, useContext } from 'react';
import type { CounterPort, MediaPort } from '../domain/ports';

export const CounterPortContext = createContext<CounterPort | null>(null);

export function useCounterPort(): CounterPort {
  const port = useContext(CounterPortContext);
  if (!port) throw new Error('useCounterPort se usa dentro de <CounterScreen>');
  return port;
}

/** null cuando no hay webhook de n8n: el chat queda solo con texto. */
export const MediaPortContext = createContext<MediaPort | null>(null);

export const useMediaPort = (): MediaPort | null => useContext(MediaPortContext);
