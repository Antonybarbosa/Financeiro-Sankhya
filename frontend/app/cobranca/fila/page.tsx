'use client';

import { Suspense } from 'react';
import { FilaCobranca } from '@/components/cobranca/FilaCobranca';
import { Loader2 } from 'lucide-react';

export default function FilaPage() {
  return (
    <Suspense fallback={
      <div className="flex h-64 items-center justify-center text-gray-500 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        Carregando Fila...
      </div>
    }>
      <FilaCobranca apenasVencidos />
    </Suspense>
  );
}
