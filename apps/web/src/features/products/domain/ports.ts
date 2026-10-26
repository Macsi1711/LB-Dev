import type { StoragePhoto } from '@/shared/lib/storage-photo';
import type { ArticleFields, NewProduct } from './new-product';

export interface Family {
  code: string;
  name: string | null;
}

export interface CreatedProduct {
  id: number;
  code: string;
  name: string | null;
}

/** Un artículo existente, para elegirlo y editarlo o eliminarlo. */
export interface EditableArticle extends ArticleFields {
  id: number;
  familyName: string | null;
  storagePhoto: StoragePhoto | null;
  hasPhoto: boolean;
}

export interface ProductsPort {
  /** Las familias de producto, para elegir la del producto nuevo. */
  families(): Promise<Family[]>;
  /** Crea el producto (rpc crear_articulo). Falla con CreateProductError. */
  create(product: NewProduct): Promise<CreatedProduct>;
  /** Busca artículos para editar (misma búsqueda que el Mostrador). */
  findArticles(q: string): Promise<EditableArticle[]>;
  /** Corrige nombre, familia, descripción y observaciones (rpc editar_articulo). El código no. */
  update(id: number, product: NewProduct): Promise<CreatedProduct>;
  /** Lo saca del catálogo, con copia en la base (rpc eliminar_articulo). */
  remove(id: number): Promise<void>;
  /** Sube y asigna la foto, igual que "Agregar foto". Falla con UploadError. */
  savePhoto(articleId: number, photo: { full: Blob; mini: Blob }): Promise<void>;
}
