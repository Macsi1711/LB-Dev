import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import type { UploadTarget } from '../domain/ports';
import { AddPhotoTab } from './add-photo-tab';
import { CoverageCard } from './coverage-card';
import { MissingPhotosTab } from './missing-photos-tab';
import { usePhotosPort } from './photos-context';

export function PhotosPage() {
  const port = usePhotosPort();
  const stats = useQuery({ queryKey: ['stats-fotos'], queryFn: () => port.stats() });
  const [tab, setTab] = useState('agregar');
  const [target, setTarget] = useState<UploadTarget | null>(null);
  // Desde "Sin foto": abre "Agregar foto" con el artículo ya elegido.
  const addPhoto = (article: UploadTarget) => {
    setTarget(article);
    setTab('agregar');
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-3 sm:p-4">
      <h1 className="text-xl font-semibold">Fotos</h1>
      <p className="rounded-md border bg-muted p-3 text-sm">
        Para cargar o cambiar la foto de un artículo, usá <strong>Agregar foto</strong>: se ve al
        instante en el Mostrador.
      </p>
      {stats.data ? <CoverageCard stats={stats.data} /> : <Skeleton className="h-24" />}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="agregar">Agregar foto</TabsTrigger>
          <TabsTrigger value="sin-foto">Sin foto</TabsTrigger>
        </TabsList>
        <TabsContent value="agregar">
          <AddPhotoTab target={target} onTargetChange={setTarget} />
        </TabsContent>
        <TabsContent value="sin-foto">
          <MissingPhotosTab families={stats.data?.families ?? []} onAddPhoto={addPhoto} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
