import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { EditProductTab } from './edit-product-tab';
import { NewProductTab } from './new-product-tab';

/** Sección Productos (solo admin): agregar, corregir o sacar artículos del catálogo. */
export function ProductsPage() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-3 sm:p-4">
      <h1 className="text-xl font-semibold">Productos</h1>
      <p className="max-w-xl rounded-md border bg-muted p-3 text-sm">
        Los cambios se ven al instante en el Mostrador y en el bot. Si el código de un producto
        nuevo ya existe, no se guarda.
      </p>
      <Tabs defaultValue="agregar">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="agregar">Agregar</TabsTrigger>
          <TabsTrigger value="editar">Editar o eliminar</TabsTrigger>
        </TabsList>
        <TabsContent value="agregar">
          <NewProductTab />
        </TabsContent>
        <TabsContent value="editar">
          <EditProductTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
