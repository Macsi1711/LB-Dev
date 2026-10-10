import { createContext, useContext } from 'react';
import type { BotPort } from '../domain/ports';

export const BotPortContext = createContext<BotPort | null>(null);

export function useBotPort(): BotPort {
  const port = useContext(BotPortContext);
  if (!port) throw new Error('useBotPort se usa dentro de <BotScreen>');
  return port;
}
