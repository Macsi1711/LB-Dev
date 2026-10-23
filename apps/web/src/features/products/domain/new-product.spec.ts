import { describe, expect, it } from 'vitest';
import {
  canSave,
  CreateProductError,
  createProductErrorMessage,
  createProductErrorReason,
  EMPTY_PRODUCT,
  MAX_CODE,
  productErrors,
  savedAs,
  type NewProduct,
} from './new-product';

const product = (extra: Partial<NewProduct> = {}): NewProduct => ({
  ...EMPTY_PRODUCT,
  code: 'PH5949',
  name: 'Filtro de aceite Fiat Cronos',
  family: 'FA',
  ...extra,
});

describe('productErrors', () => {
  it('un producto con código, nombre y familia se puede guardar', () => {
    expect(productErrors(product())).toEqual({});
    expect(canSave(product())).toBe(true);
  });

  it('pide código, nombre y familia (los espacios solos no cuentan)', () => {
    expect(productErrors(EMPTY_PRODUCT)).toEqual({
      code: 'Poné el código.',
      name: 'Poné el nombre.',
      family: 'Elegí la familia.',
    });
    expect(productErrors(product({ code: '   ', name: ' ' }))).toEqual({
      code: 'Poné el código.',
      name: 'Poné el nombre.',
    });
    expect(canSave(EMPTY_PRODUCT)).toBe(false);
  });

  it(`el código tiene hasta ${MAX_CODE} caracteres`, () => {
    expect(productErrors(product({ code: 'X'.repeat(MAX_CODE) }))).toEqual({});
    expect(productErrors(product({ code: 'X'.repeat(MAX_CODE + 1) }))).toEqual({
      code: `El código tiene hasta ${MAX_CODE} caracteres.`,
    });
  });
});

describe('savedAs', () => {
  it('muestra cómo queda guardado: código y nombre en mayúsculas y sin espacios en los bordes', () => {
    expect(savedAs(product({ code: ' ph5949 ', name: ' filtro  cronos ' }))).toEqual({
      code: 'PH5949',
      name: 'FILTRO  CRONOS',
    });
  });
});

describe('createProductErrorReason', () => {
  it('según el código de error de la base, explica por qué no se guardó', () => {
    expect(createProductErrorReason('23505')).toBe('duplicate');
    expect(createProductErrorReason('22023')).toBe('invalid');
    expect(createProductErrorReason('42501')).toBe('unauthorized');
    expect(createProductErrorReason(undefined)).toBe('failed');
    expect(createProductErrorReason('08006')).toBe('failed');
  });
});

describe('CreateProductError', () => {
  it('lleva el motivo y el mensaje de la base para mostrarlo', () => {
    const error = new CreateProductError('duplicate', 'Ya existe un artículo con el código PH5949');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('CreateProductError');
    expect(createProductErrorMessage(error.reason, error.detail)).toBe(
      'Ya existe un artículo con el código PH5949.',
    );
  });
});

describe('createProductErrorMessage', () => {
  it('si el código ya existe, dice cuál es', () => {
    expect(
      createProductErrorMessage('duplicate', 'Ya existe un artículo con el código PH5949'),
    ).toBe('Ya existe un artículo con el código PH5949.');
    expect(createProductErrorMessage('duplicate')).toBe('Ya existe un artículo con ese código.');
  });

  it('el resto de los errores se explica en una línea', () => {
    expect(createProductErrorMessage('invalid', 'La familia XX no existe')).toBe(
      'La familia XX no existe.',
    );
    expect(createProductErrorMessage('invalid')).toBe('Revisá los datos del producto.');
    expect(createProductErrorMessage('unauthorized')).toBe(
      'Tu sesión venció o no sos admin. Volvé a entrar.',
    );
    expect(createProductErrorMessage('failed')).toBe('No se pudo guardar. Probá de nuevo.');
  });
});
