/** Un producto nuevo que carga el admin (rpc crear_articulo). Los textos van como se escriben. */
export interface NewProduct {
  code: string;
  name: string;
  /** Código de la familia. */
  family: string;
  description: string;
  notes: string;
}

export const EMPTY_PRODUCT: NewProduct = {
  code: '',
  name: '',
  family: '',
  description: '',
  notes: '',
};

/** El mismo tope que pone la base. */
export const MAX_CODE = 40;

export type ProductField = 'code' | 'name' | 'family';

/** Lo que falta o está mal, por campo, antes de mandarlo (la base vuelve a validar todo). */
export function productErrors(p: NewProduct): Partial<Record<ProductField, string>> {
  const errors: Partial<Record<ProductField, string>> = {};
  const code = p.code.trim();
  if (!code) errors.code = 'Poné el código.';
  else if (code.length > MAX_CODE) errors.code = `El código tiene hasta ${MAX_CODE} caracteres.`;
  if (!p.name.trim()) errors.name = 'Poné el nombre.';
  if (!p.family) errors.family = 'Elegí la familia.';
  return errors;
}

export const canSave = (p: NewProduct) => Object.keys(productErrors(p)).length === 0;

/** Cómo queda guardado: la base pasa código y nombre a mayúsculas, como el resto del catálogo. */
export const savedAs = (p: NewProduct) => ({
  code: p.code.trim().toUpperCase(),
  name: p.name.trim().toUpperCase(),
});

/** Los datos de un artículo existente que el formulario de edición necesita. */
export interface ArticleFields {
  code: string;
  name: string | null;
  description: string | null;
  notes: string | null;
  familyCode: string | null;
}

/** Carga en el formulario el artículo que se va a editar (el código no se edita). */
export const productFromArticle = (a: ArticleFields): NewProduct => ({
  code: a.code,
  name: a.name ?? '',
  family: a.familyCode ?? '',
  description: a.description ?? '',
  notes: a.notes ?? '',
});

export type CreateProductErrorReason =
  'duplicate' | 'invalid' | 'unauthorized' | 'missing' | 'failed';

export class CreateProductError extends Error {
  constructor(
    readonly reason: CreateProductErrorReason,
    /** El mensaje de la base (por ejemplo, qué código ya existe). */
    readonly detail?: string,
  ) {
    super(reason);
    this.name = 'CreateProductError';
  }
}

/** Por qué no se guardó, según el código de error de Postgres de crear, editar o eliminar. */
export function createProductErrorReason(code: string | undefined): CreateProductErrorReason {
  if (code === '23505') return 'duplicate';
  if (code === '22023') return 'invalid';
  if (code === '42501') return 'unauthorized';
  if (code === 'P0002') return 'missing';
  return 'failed';
}

const sentence = (text: string) => (text.endsWith('.') ? text : `${text}.`);

export function createProductErrorMessage(
  reason: CreateProductErrorReason,
  detail?: string,
): string {
  switch (reason) {
    case 'duplicate':
      return detail ? sentence(detail) : 'Ya existe un artículo con ese código.';
    case 'invalid':
      return detail ? sentence(detail) : 'Revisá los datos del producto.';
    case 'unauthorized':
      return 'Tu sesión venció o no sos admin. Volvé a entrar.';
    case 'missing':
      return 'Ese artículo ya no existe: puede que lo haya eliminado otro admin.';
    case 'failed':
      return 'No se pudo guardar. Probá de nuevo.';
  }
}
