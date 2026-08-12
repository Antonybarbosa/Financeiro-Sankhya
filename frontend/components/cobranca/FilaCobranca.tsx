'use client';

import { useState } from 'react';
import { DashboardCards } from '@/components/cobranca/DashboardCards';
import { MasterDetailView } from '@/components/cobranca/views/MasterDetailView';
import { KanbanView } from '@/components/cobranca/views/KanbanView';
import { TableView } from '@/components/cobranca/views/TableView';
import { useAtendimentosHoje } from '@/hooks/useCobranca';
import {
  Columns3,
  KanbanSquare,
  Table,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TipoView } from '@/types/cobranca';

const viewOptions: { key: TipoView; label: string; icon: typeof Columns3 }[] = [
  { key: 'kanban', label: 'Atendimento', icon: KanbanSquare },
  { key: 'master-detail', label: 'Lista + Detalhe', icon: Columns3 },
  { key: 'tabela', label: 'Tabela', icon: Table },
];

interface FilaCobrancaProps {
  apenasVencidos?: boolean;
  defaultView?: TipoView;
}

function ProgressAtendimentos() {
  const { data } = useAtendimentosHoje();
  if (!data || data.total === 0) return null;

  const total = data.total;
  const resolvidos = data.resolvidos;
  const pendentes = data.pendentes;
  const pct = total > 0 ? Math.round((resolvidos / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-600" />
          <span className="text-sm font-semibold text-gray-700">
            Atendimentos de hoje
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {resolvidos} resolvidos
          </span>
          <span className="inline-flex items-center gap-1 text-orange-700">
            <Clock className="h-3.5 w-3.5" />
            {pendentes} pendentes
          </span>
          <span className="text-gray-400">·</span>
          <span className="font-medium text-gray-700">{pct}%</span>
        </div>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function FilaCobranca({ apenasVencidos, defaultView = 'kanban' }: FilaCobrancaProps) {
  const [view, setView] = useState<TipoView>(defaultView);
  const [filtro, setFiltro] = useState<'vencidos' | 'avencer' | 'total' | null>(null);

  const showApenasVencidos = apenasVencidos || filtro === 'vencidos';

  return (
    <div className="space-y-4">
      <DashboardCards activeFilter={filtro} onCardClick={setFiltro} />

      {view === 'kanban' && <ProgressAtendimentos />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {view === 'kanban' ? 'Agenda de Atendimento' : 'Fila de Atendimento'}
          </h2>
          <p className="text-xs text-gray-500">
            {view === 'kanban'
              ? 'Atendimentos do dia (TGFTEL). Finalize ou reabra conforme atende cada parceiro.'
              : 'Priorize por valor e atraso. Clique em um parceiro para ver detalhes.'}
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
          {viewOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = view === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setView(opt.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {view === 'master-detail' && <MasterDetailView />}
      {view === 'kanban' && <KanbanView />}
      {view === 'tabela' && <TableView apenasVencidos={showApenasVencidos} />}
    </div>
  );
}
