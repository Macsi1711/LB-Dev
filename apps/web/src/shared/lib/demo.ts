/**
 * Modo demo (VITE_DEMO=1): la app corre sin Supabase, con datos de ejemplo en memoria.
 * Sirve para mostrarla; nunca se usa en producción.
 */
export const isDemo = import.meta.env.VITE_DEMO === '1';
