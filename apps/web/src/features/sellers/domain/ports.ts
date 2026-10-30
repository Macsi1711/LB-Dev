import type { Seller } from './seller';

export interface SellersPort {
  /** Los vendedores con cuenta en la web (rpc vendedores_web, solo admin). */
  list(): Promise<Seller[]>;
  /** Le pone una contraseña nueva (rpc cambiar_clave_vendedor). Falla con SellersDataError. */
  resetPassword(userId: string, password: string): Promise<void>;
}

/** Error de la base con el código de Postgres, para elegir el mensaje. */
export class SellersDataError extends Error {
  constructor(
    message: string,
    readonly code: string | undefined,
  ) {
    super(message);
  }
}
