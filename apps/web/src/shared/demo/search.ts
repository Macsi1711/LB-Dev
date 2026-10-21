import { normalize, trigrams } from './text';

// Mismas reglas que terminos_busqueda() en la base (migración 0014), para que el demo busque igual.
const FILLER = new Set(
  (
    'a al ante con contra de del desde e el en entre es esa ese esta este hay la las le lo los me ' +
    'mi o para pero por que se sin sobre su te u un una uno unos unas y tenes tenga tengo tiene ' +
    'tienen busco buscar necesito quiero dame pasame mostrame hola che buenas buen dia precio ' +
    'cuanto sale vale algun alguna alguno algo favor porfa gracias auto autos coche vehiculo ' +
    'repuesto repuestos'
  ).split(' '),
);

const ABBREVIATIONS: Record<string, string> = Object.fromEntries(
  Object.entries({ tras: 'traser', del: 'delanter', izq: 'izquierd', der: 'derech' }).flatMap(
    ([abbr, root]) => ['a', 'o', 'as', 'os'].map((end) => [root + end, abbr]),
  ),
);

function stem(word: string): string {
  if (/[0-9]/.test(word)) return word;
  const abbr = ABBREVIATIONS[word];
  if (abbr) return abbr;
  if (word.length > 4 && /[^aeious]es$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && /s$/.test(word) && !/ss$/.test(word)) return word.slice(0, -1);
  return word;
}

/** Las palabras que se buscan: sin signos, sin relleno, en singular y con abreviaturas. */
export function searchTerms(q: string): string[] {
  const words = normalize(q)
    .replace(/[^a-z0-9./%_-]+/g, ' ')
    .split(' ')
    .map((w) => w.replace(/^[./-]+|[./-]+$/g, ''))
    .filter(Boolean);
  const useful = words.filter((w) => !FILLER.has(w));
  return [...new Set((useful.length > 0 ? useful : words).map(stem))];
}

/** Como word_similarity() de pg_trgm: cuánto del término aparece en la palabra más parecida. */
function wordSimilarity(term: string, text: string): number {
  const t = trigrams(term);
  return Math.max(
    0,
    ...text.split(' ').map((word) => {
      const w = trigrams(word);
      return [...t].filter((g) => w.has(g)).length / (t.size || 1);
    }),
  );
}

/** Como compactar_busqueda(): solo letras y números ("PH 4386" → "ph4386"). */
export const compact = (text: string): string => normalize(text).replace(/[^a-z0-9]+/g, '');

/** Como termino_compacto() (migración 0023): el término compacto si parece código, si no null. */
export function compactTerm(term: string): string | null {
  const c = compact(term);
  const looksLikeCode = /[0-9]/.test(term) && (/[a-z]/.test(c) || /[./-]/.test(term));
  return looksLikeCode && c.length >= 4 ? c : null;
}

/** El término aparece; si parece código, también sin espacios, guiones ni barras. */
export function containsTerm(term: string, text: string): boolean {
  const c = compactTerm(term);
  return text.includes(term) || (c !== null && compact(text).includes(c));
}

/** Un término cuenta si aparece o si se le parece (errores de tipeo). `text` ya normalizado. */
export function termMatches(term: string, text: string): boolean {
  return containsTerm(term, text) || wordSimilarity(term, text) >= 0.6;
}
