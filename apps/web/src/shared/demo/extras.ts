// Datos del bot para el modo demo. Inventados.

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

export const demoTelegramUsers = [
  {
    chatId: 111111111,
    name: 'Juan (mostrador)',
    active: true,
    notes: 'Turno mañana',
    createdAt: ago(60 * 24 * 40),
  },
  {
    chatId: 222222222,
    name: 'Marta (depósito)',
    active: true,
    notes: null,
    createdAt: ago(60 * 24 * 20),
  },
  {
    chatId: 333333333,
    name: 'Pedro',
    active: false,
    notes: 'Ya no trabaja',
    createdAt: ago(60 * 24 * 90),
  },
];

type Q = [
  chatId: number,
  source: 'texto' | 'foto' | 'audio',
  text: string,
  results: number | null,
  error: string | null,
  minutesAgo: number,
];
const queries: Q[] = [
  [111111111, 'texto', 'pastilla onix', 2, null, 5],
  [222222222, 'audio', 'filtro de aceite gol', 1, null, 18],
  [111111111, 'foto', 'amortiguador delantero corsa', 1, null, 42],
  [444444444, 'texto', 'hola', null, 'no autorizado', 70],
  [222222222, 'texto', 'kit distribución etios', 0, null, 95],
  [111111111, 'audio', 'kit distribucion Etios', 0, null, 300],
  [222222222, 'texto', 'bujia iridium', 1, null, 600],
  [111111111, 'texto', 'pastilla hilux', 1, null, 1500],
  [111111111, 'foto', 'bomba de agua kangoo', 0, null, 2900],
  [222222222, 'texto', 'Bomba de agua Kangoo', 0, null, 4400],
  [111111111, 'texto', 'disco freno 208', 1, null, 5800],
  [222222222, 'audio', 'lampara h7', 1, null, 7000],
  [111111111, 'texto', 'radiador gol trend', 0, null, 9000],
];
export interface DemoBotQuery {
  id: number;
  chatId: number | null;
  channel: 'web' | 'telegram';
  /** Solo las de la web; las de Telegram toman el nombre de la lista blanca. */
  userName?: string;
  source: Q[1];
  text: string;
  heard: string | null;
  family: string | null;
  withPhoto: boolean | null;
  approximate: boolean | null;
  sql: string | null;
  results: number | null;
  error: string | null;
  createdAt: string;
}

export const demoBotQueries: DemoBotQuery[] = queries.map(
  ([chatId, source, text, results, error, minutes], i) => ({
    id: i + 1,
    chatId,
    channel: 'telegram',
    source,
    text,
    heard: null,
    family: null,
    withPhoto: null,
    approximate: null,
    sql: error
      ? null
      : `SELECT "Codigo", "Nombre artículo" FROM articulos WHERE "Nombre artículo" ILIKE '%${text.toUpperCase()}%' LIMIT 20`,
    results,
    error,
    createdAt: ago(minutes),
  }),
);
