/** Roles de la web (perfiles.rol). */
export type Role = 'vendedor' | 'admin';

/** Quién usa la web: un rol con sesión, o nadie (sin sesión va al login, ADR-013). */
export type Viewer = Role | 'anonimo';
