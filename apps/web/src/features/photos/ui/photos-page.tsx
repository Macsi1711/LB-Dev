import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { CoverageCard } from './coverage-card';
import { MissingPhotosTab } from './missing-photos-tab';
import { usePhotosPort } from './photos-context';
import { UnmatchedPhotosTab } from './unmatched-photos-tab';

export function PhotosPage() {
  const port = usePhotosPort();
  const stats = useQuery({ queryKey: ['stats-fotos'], queryFn: () => port.stats() });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-3 sm:p-4">
      <h1 className="text-xl font-semibold">Fotos</h1>
      <p className="rounded-md border bg-muted p-3 text-sm">
        Para cargar fotos, subilas a la carpeta de Drive <em>Lois base de datos</em> con el{' '}
        <strong>código del artículo como nombre</strong> (ej:{' '}
        <code className="font-mono">854000.jpg</code>). Se asignan solas en ~1 minuto.
      </p>
      {stats.data ? <CoverageCard stats={stats.data} /> : <Skeleton className="h-24" />}
      <Tabs defaultValue="sin-foto">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="sin-foto">Sin foto</TabsTrigger>
          <TabsTrigger value="sin-match">Fotos que no matchearon</TabsTrigger>
        </TabsList>
        <TabsContent value="sin-foto">
          <MissingPhotosTab families={stats.data?.families ?? []} />
        </TabsContent>
        <TabsContent value="sin-match">
          <UnmatchedPhotosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
