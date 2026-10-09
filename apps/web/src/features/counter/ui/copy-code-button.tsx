import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/button';

export function CopyCodeButton({ code, label }: { code: string; label?: string }) {
  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Código ${code} copiado`);
    } catch {
      toast.error('No se pudo copiar. Seleccioná el código a mano.');
    }
  }
  return (
    <Button
      variant={label ? 'outline' : 'ghost'}
      size={label ? 'default' : 'icon'}
      onClick={copy}
      aria-label={`Copiar código ${code}`}
    >
      <Copy />
      {label}
    </Button>
  );
}
