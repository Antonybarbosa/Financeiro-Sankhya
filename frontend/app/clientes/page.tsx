'use client';

import { ClientesModule } from '@/components/clientes/ClientesModule';
import { Users } from 'lucide-react';

export default function ClientesPage() {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">Gestão de Clientes</h2>
        </div>
        <p className="mt-0.5 text-xs text-gray-500">
          Pesquisa, cadastro e manutenção de parceiros (TGFPAR)
        </p>
      </div>

      <ClientesModule />
    </div>
  );
}
