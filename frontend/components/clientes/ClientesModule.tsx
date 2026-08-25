'use client';

import { useState } from 'react';
import { Cliente } from '@/types/cliente';
import { useClienteCount } from '@/hooks/useCliente';
import { ClientesList } from './ClientesList';
import { ClienteFormModal } from './ClienteFormModal';
import { Plus, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ClientesModule() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);

  const { data: countData } = useClienteCount();

  const handleOpenCreateModal = () => {
    setEditingCliente(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCliente(null);
  };

  return (
    <div className="space-y-4">
      {/* Action Header & Counter */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {countData?.total !== undefined && (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm">
              <UserCheck className="h-4 w-4 text-blue-600" />
              <span>Total de Clientes:</span>
              <strong className="font-bold text-gray-900">{countData.total}</strong>
            </div>
          )}
        </div>

        <Button
          onClick={handleOpenCreateModal}
          size="sm"
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Main List & Search Component */}
      <ClientesList onEditCliente={handleOpenEditModal} />

      {/* Modal for Create & Edit */}
      <ClienteFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        cliente={editingCliente}
      />
    </div>
  );
}
