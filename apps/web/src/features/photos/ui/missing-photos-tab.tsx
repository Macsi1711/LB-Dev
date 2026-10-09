import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { downloadText } from '@/shared/lib/download';
import { Button } from '@/shared/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { missingPhotosCsv } from '../domain/coverage';
import type { CoverageStat } from '../domain/ports';
import { usePhotosPort } from './photos-context';

const PAGE = 100;

export function MissingPhotosTab({ families }: { families: CoverageStat[] }) {
  const port = usePhotosPort();
  const [family, setFamily] = useState<string | null>(null);
  const withMissing = families.filter((f) => f.total > f.withPhoto);

  const list = useInfiniteQuery({
    queryKey: ['sin-foto', family],
    queryFn: ({ pageParam }) => port.missingPhotos(family, pageParam, PAGE),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length < PAGE ? undefined : pages.length * PAGE),
  });
  const exportCsv = useMutation({
    mutationFn: () => port.allMissingPhotos(family),
    onSuccess: (rows) => {
      const date = new Date().toISOString().slice(0, 10);
      downloadText(`sin-foto-${family ?? 'todas'}-${date}.csv`, missingPhotosCsv(rows));
    },
    onError: () => toast.error('No se pudo exportar. Probá de nuevo.'),
  });
  const rows = list.data?.pages.flat() ?? [];

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Familia"
          className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm sm:max-w-80"
          value={family ?? ''}
          onChange={(e) => setFamily(e.target.value || null)}
        >
          <option value="">Todas las familias</option>
          {withMissing.map((f) => (
            <option key={f.familyCode ?? '-'} value={f.familyCode ?? ''}>
              {f.familyName ?? f.familyCode} ({f.total - f.withPhoto} sin foto)
            </option>
          ))}
        </select>
        <Button variant="outline" onClick={() => exportCsv.mutate()} disabled={exportCsv.isPending}>
          <Download />
          {exportCsv.isPending ? 'Exportando…' : 'Exportar CSV'}
        </Button>
      </div>

      {list.isError ? (
        <p className="text-destructive">No se pudo cargar la lista.</p>
      ) : list.isSuccess && rows.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">
          Todos los artículos tienen foto. 🎉
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden sm:table-cell">Familia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono font-semibold text-codigo">{r.code}</TableCell>
                <TableCell className="whitespace-normal">{r.name}</TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {r.familyName}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {list.hasNextPage && (
        <Button
          variant="outline"
          className="mx-auto"
          onClick={() => void list.fetchNextPage()}
          disabled={list.isFetchingNextPage}
        >
          {list.isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
        </Button>
      )}
    </div>
  );
}
