import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import type { UploadTarget } from '../domain/ports';
import { AddPhotoTab } from './add-photo-tab';
import { CoverageCard } from './coverage-card';
import { MissingPhotosTab } from './missing-photos-tab';
import { usePhotosPort, usePhotoUpload } from './photos-context';
import { UnmatchedPhotosTab } from './unmatched-photos-tab';

export function PhotosPage() {
  const port = usePhotosPort();
  const upload = usePhotoUpload();
  const stats = useQuery({ queryKey: ['stats-fotos'], queryFn: () => port.stats() });
  const [tab, setTab] = useState(upload ? 'agregar' : 'sin-foto');
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
        {upload && (
          <>
            Para cargar una foto, usá <strong>Agregar foto</strong>. También podés{' '}
          </>
        )}
        {upload ? 'subirlas' : 'Para cargar fotos, subilas'} a la carpeta de Drive{' '}
        <em>Lois base de datos</em> con el <strong>código del artículo como nombre</strong> (ej:{' '}
        <code className="font-mono">854000.jpg</code>): se asignan solas en ~1 minuto.
      </p>
      {stats.data ? <CoverageCard stats={stats.data} /> : <Skeleton className="h-24" />}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="max-w-full justify-start overflow-x-auto">
          {upload && <TabsTrigger value="agregar">Agregar foto</TabsTrigger>}
          <TabsTrigger value="sin-foto">Sin foto</TabsTrigger>
          <TabsTrigger value="sin-match">Fotos que no matchearon</TabsTrigger>
        </TabsList>
        {upload && (
          <TabsContent value="agregar">
            <AddPhotoTab upload={upload} target={target} onTargetChange={setTarget} />
          </TabsContent>
        )}
        <TabsContent value="sin-foto">
          <MissingPhotosTab
            families={stats.data?.families ?? []}
            {...(upload && { onAddPhoto: addPhoto })}
          />
        </TabsContent>
        <TabsContent value="sin-match">
          <UnmatchedPhotosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
