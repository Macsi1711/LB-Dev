import type { CounterPort } from '../domain/ports';
import type { SearchState } from '../domain/search-state';

/**
 * Cuántos encontró una consulta. La respuesta del chat y el registro en las métricas usan esta
 * misma clave, así React Query hace un solo pedido y la base no cuenta dos veces.
 */
export const summaryQuery = (port: CounterPort, state: SearchState) => ({
  queryKey: ['articulos-resumen', state] as const,
  queryFn: () => port.summary(state),
});
