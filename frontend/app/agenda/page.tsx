'use client';

import { AgendaList } from '@/components/agenda/AgendaList';
import { Calendar } from 'lucide-react';

export default function AgendaPage() {
  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">Agenda Financeira do Dia</h2>
        </div>
        <p className="mt-0.5 text-xs text-gray-500 capitalize">{hoje}</p>
      </div>
      <AgendaList />
    </div>
  );
}
