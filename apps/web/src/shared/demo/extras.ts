// Fotos sin match y datos del bot para el modo demo. Inventados.

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

export const demoUnmatchedPhotos = [
  {
    id: 1,
    driveId: 'demo/pastilla-freno',
    file: '854001 copia.jpg',
    candidates: '854001 COPIA|854001COPIA',
    createdAt: ago(30),
    resolved: false,
  },
  {
    id: 2,
    driveId: 'demo/filtro-aceite',
    file: 'filtro hilux.png',
    candidates: 'FILTRO HILUX|FILTROHILUX',
    createdAt: ago(240),
    resolved: false,
  },
  {
    id: 3,
    driveId: 'demo/amortiguador',
    file: 'AMO620.jpeg',
    candidates: 'AMO620',
    createdAt: ago(1500),
    resolved: false,
  },
];

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
export const demoBotQueries = queries.map(([chatId, source, text, results, error, minutes], i) => ({
  id: i + 1,
  chatId,
  source,
  text,
  sql: error
    ? null
    : `SELECT "Codigo", "Nombre artículo" FROM articulos WHERE "Nombre artículo" ILIKE '%${text.toUpperCase()}%' LIMIT 20`,
  results,
  error,
  createdAt: ago(minutes),
}));
