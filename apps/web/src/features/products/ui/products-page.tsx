import { NewProductTab } from './new-product-tab';

/** Sección Productos (solo admin): agregar artículos al catálogo. */
export function ProductsPage() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-3 sm:p-4">
      <h1 className="text-xl font-semibold">Productos</h1>
      <p className="max-w-xl rounded-md border bg-muted p-3 text-sm">
        Cargá un producto nuevo: aparece al instante en el Mostrador y en el bot. Si el código ya
        existe, no se guarda.
      </p>
      <NewProductTab />
    </div>
  );
}
