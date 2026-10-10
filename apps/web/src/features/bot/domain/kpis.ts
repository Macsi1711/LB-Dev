export interface BotKpis {
  today: number;
  week: number;
  /** % de consultas sin resultados en los últimos 7 días; null si no hubo consultas. */
  noResultsPct: number | null;
  activeUsers: number;
}

export interface MissingSearch {
  text: string;
  times: number;
  last: string;
}

export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)} %`;
}
