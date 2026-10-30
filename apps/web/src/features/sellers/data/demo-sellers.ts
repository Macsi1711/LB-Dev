import type { Seller } from '../domain/seller';
import type { SellersPort } from '../domain/ports';

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

const SELLERS: Seller[] = [
  { userId: 'demo-1', name: 'Carla', email: 'carla@demo', lastSignIn: daysAgo(0) },
  { userId: 'demo-2', name: 'Diego', email: 'diego@demo', lastSignIn: daysAgo(2) },
  { userId: 'demo-3', name: null, email: 'mostrador3@demo', lastSignIn: null },
];

/** En el demo la contraseña no se guarda en ningún lado. */
export function createDemoSellers(): SellersPort {
  return {
    list: async () => SELLERS,
    resetPassword: async () => undefined,
  };
}
