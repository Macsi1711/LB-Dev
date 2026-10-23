import type { NewProduct } from './new-product';

export interface Family {
  code: string;
  name: string | null;
}

export interface CreatedProduct {
  id: number;
  code: string;
  name: string | null;
}

export interface ProductsPort {
  /** Las familias de producto, para elegir la del producto nuevo. */
  families(): Promise<Family[]>;
  /** Crea el producto (rpc crear_articulo). Falla con CreateProductError. */
  create(product: NewProduct): Promise<CreatedProduct>;
  /** Sube y asigna la foto, igual que "Agregar foto". Falla con UploadError. */
  savePhoto(articleId: number, photo: { full: Blob; mini: Blob }): Promise<void>;
}
