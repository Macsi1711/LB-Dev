const number = new Intl.NumberFormat('es-AR');

/** "1.234 de 5.678 artículos con foto (22 %)" */
export function coverageText(stat: { total: number; withPhoto: number }): string {
  const pct = stat.total ? Math.round((stat.withPhoto / stat.total) * 100) : 0;
  return `${number.format(stat.withPhoto)} de ${number.format(stat.total)} artículos con foto (${pct} %)`;
}

const cell = (value: string | null) => {
  const text = value ?? '';
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Lista de tareas para fotografiar: CSV con ; (Excel en español) y BOM para las tildes. */
export function missingPhotosCsv(rows: { code: string; name: string | null }[]): string {
  const lines = ['codigo;nombre', ...rows.map((r) => `${cell(r.code)};${cell(r.name)}`)];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
