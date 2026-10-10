/** Normaliza como normalizar_busqueda() en la base: sin tildes, minúsculas, un espacio. */
export function normalize(text: string | null | undefined): string {
  return (text ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function trigrams(text: string): Set<string> {
  const padded = `  ${text} `;
  const set = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) set.add(padded.slice(i, i + 3));
  return set;
}

/** Parecido entre 0 y 1, como similarity() de pg_trgm. */
export function similarity(a: string, b: string): number {
  const ta = trigrams(normalize(a));
  const tb = trigrams(normalize(b));
  const shared = [...ta].filter((t) => tb.has(t)).length;
  return shared / (ta.size + tb.size - shared || 1);
}
