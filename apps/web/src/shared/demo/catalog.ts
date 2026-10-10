// Datos de ejemplo del modo demo. Son inventados: no corresponden al catálogo real.

export interface DemoArticle {
  id: number;
  code: string;
  name: string;
  description: string | null;
  notes: string | null;
  family: string;
  /** "demo/<ilustración>" o null si no tiene foto. */
  photo: string | null;
}

export const demoFamilies: { code: string; name: string; isProduct: boolean }[] = [
  { code: 'PF', name: 'PASTILLAS DE FRENO', isProduct: true },
  { code: 'DF', name: 'DISCOS DE FRENO', isProduct: true },
  { code: 'FA', name: 'FILTROS DE ACEITE', isProduct: true },
  { code: 'FI', name: 'FILTROS DE AIRE', isProduct: true },
  { code: 'BU', name: 'BUJÍAS', isProduct: true },
  { code: 'AM', name: 'AMORTIGUADORES', isProduct: true },
  { code: 'CO', name: 'CORREAS', isProduct: true },
  { code: 'LA', name: 'LÁMPARAS', isProduct: true },
  { code: '999', name: 'VARIOS', isProduct: false },
];

type Row = [
  code: string,
  name: string,
  description: string | null,
  notes: string | null,
  family: string,
  photo: string | null,
];

const rows: Row[] = [
  [
    '854000',
    'PASTILLA FRENO DEL. CHEVROLET ONIX',
    'Juego x4, eje delantero',
    null,
    'PF',
    'pastilla-freno',
  ],
  [
    '854001',
    'PASTILLA FRENO TRAS. CHEVROLET ONIX',
    'Juego x4, eje trasero',
    'Consultar stock antes de vender',
    'PF',
    null,
  ],
  ['854100', 'PASTILLA FRENO DEL. FIAT CRONOS', 'Juego x4', null, 'PF', 'pastilla-freno'],
  [
    '854210',
    'PASTILLA FRENO DEL. VW GOL TREND',
    'Juego x4, con sensor',
    null,
    'PF',
    'pastilla-freno',
  ],
  [
    '854320',
    'PASTILLA FRENO DEL. TOYOTA HILUX',
    'Juego x4, cerámica',
    'Viene sin clips: ofrecer el kit 854321',
    'PF',
    null,
  ],
  ['860010', 'DISCO FRENO VENTILADO PEUGEOT 208', 'Par, 266 mm', null, 'DF', 'disco-freno'],
  ['860020', 'DISCO FRENO VENTILADO CHEVROLET ONIX', 'Par, 256 mm', null, 'DF', 'disco-freno'],
  ['860030', 'DISCO FRENO MACIZO RENAULT KANGOO', 'Par, 238 mm', null, 'DF', null],
  ['120-33', 'FILTRO DE ACEITE VW GOL TREND', 'Rosca 3/4', null, 'FA', 'filtro-aceite'],
  ['120-34', 'FILTRO DE ACEITE RENAULT KANGOO', null, 'Reemplaza al 120-30', 'FA', 'filtro-aceite'],
  ['120-40', 'FILTRO DE ACEITE TOYOTA HILUX 2.8', null, null, 'FA', null],
  ['130-10', 'FILTRO DE AIRE FIAT CRONOS 1.3', 'Panel', null, 'FI', 'filtro-aire'],
  ['130-11', 'FILTRO DE AIRE CHEVROLET ONIX 1.0 TURBO', 'Panel', null, 'FI', 'filtro-aire'],
  ['130-25', 'FILTRO DE AIRE FORD RANGER 3.2', 'Panel reforzado', null, 'FI', null],
  ['BUJ-10', 'BUJÍA IRIDIUM', 'Para motores nafteros', null, 'BU', 'bujia'],
  ['BUJ-12', 'BUJÍA PLATINO DOBLE ELECTRODO', null, 'Calibrar a 0,8 mm', 'BU', 'bujia'],
  ['BUJ-20', 'BUJÍA DE PRECALENTAMIENTO DIESEL', null, null, 'BU', null],
  ['AMO-500', 'AMORTIGUADOR DEL. CHEVROLET CORSA', 'Gas, unidad', null, 'AM', 'amortiguador'],
  ['AMO-510', 'AMORTIGUADOR TRAS. VW GOL TREND', 'Gas, unidad', null, 'AM', 'amortiguador'],
  [
    'AMO-620',
    'AMORTIGUADOR DEL. TOYOTA HILUX 4X4',
    'Hidráulico, unidad',
    'Se vende por par',
    'AM',
    null,
  ],
  ['COR-6PK1230', 'CORREA POLY-V 6PK 1230', 'Accesorios', null, 'CO', 'correa'],
  ['COR-5PK1100', 'CORREA POLY-V 5PK 1100', 'Accesorios', null, 'CO', null],
  ['LAM-H4', 'LÁMPARA H4 12V 60/55W', 'Unidad', null, 'LA', 'lampara'],
  ['LAM-H7', 'LÁMPARA H7 12V 55W', 'Unidad', null, 'LA', 'lampara'],
  ['999001', 'DESCUENTO ESPECIAL', null, null, '999', null],
];

export const demoArticles: DemoArticle[] = rows.map(
  ([code, name, description, notes, family, photo], i) => ({
    id: i + 1,
    code,
    name,
    description,
    notes,
    family,
    photo: photo ? `demo/${photo}` : null,
  }),
);

export const demoFamilyName = (code: string) =>
  demoFamilies.find((f) => f.code === code)?.name ?? null;

export const isProductFamily = (code: string) =>
  demoFamilies.find((f) => f.code === code)?.isProduct ?? true;
