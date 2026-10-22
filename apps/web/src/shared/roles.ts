/** Roles de la web (perfiles.rol). */
export type Role = 'vendedor' | 'admin';

/** Quién usa la web: un rol con sesión, o nadie (se busca sin login, ADR-010). */
export type Viewer = Role | 'anonimo';
