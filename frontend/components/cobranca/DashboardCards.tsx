'use client';

import { useKpisAtendimento } from '@/hooks/useCobranca';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingDown,
  Clock,
  Wallet,
  CheckCircle2,
  Loader2,
  PhoneCall,
} from 'lucide-react';

interface DashboardCardsProps {
  onCardClick?: (filter: 'vencidos' | 'avencer' | 'total' | null) => void;
  activeFilter?: 'vencidos' | 'avencer' | 'total' | null;
}

export function DashboardCards({ onCardClick, activeFilter }: DashboardCardsProps) {
  const { data, isLoading } = useKpisAtendimento();

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 py-4 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Carregando indicadores...
      </div>
    );
  }

  const { kpis, pendentes, resolvidos } = data;

  const cards = [
    {
      key: 'total' as const,
      label: 'Em Aberto',
      value: formatCurrency(kpis.valorEmAberto),
      sub: `${kpis.qtdTitulos} títulos`,
      icon: Wallet,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      ring: 'ring-blue-200',
    },
    {
      key: 'vencidos' as const,
      label: 'Vencidos',
      value: formatCurrency(kpis.valorVencido),
      sub: `${kpis.qtdVencidos} títulos`,
      icon: TrendingDown,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
      ring: 'ring-red-200',
    },
    {
      key: 'avencer' as const,
      label: 'A Vencer (7d)',
      value: formatCurrency(kpis.valorAvencer7d),
      sub: `${kpis.qtdAvencer7d} títulos`,
      icon: Clock,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      ring: 'ring-amber-200',
    },
    {
      key: null,
      label: 'Resolvidos Hoje',
      value: `${resolvidos} de ${data.total}`,
      sub: `${pendentes} pendentes`,
      icon: CheckCircle2,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      ring: 'ring-transparent',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.key;
        const clickable = onCardClick && card.key !== null;

        return (
          <button
            key={card.label}
            onClick={() => clickable && onCardClick(card.key)}
            disabled={!clickable}
            className={`
              relative overflow-hidden rounded-xl border bg-white p-3.5 text-left shadow-sm transition-all
              ${isActive ? `ring-2 ${card.ring}` : ''}
              ${clickable ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}
            `}
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-500">{card.label}</p>
                <p className="mt-0.5 text-lg font-bold text-gray-900">
                  {card.value}
                </p>
                <p className="text-[11px] text-gray-400">{card.sub}</p>
              </div>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
                <Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </div>
            {pendentes > 0 && card.key === 'total' && (
              <div className="mt-2 flex items-center gap-1.5 rounded-md bg-orange-50 px-2 py-0.5">
                <PhoneCall className="h-3 w-3 text-orange-600" />
                <span className="text-[11px] font-medium text-orange-700">
                  {pendentes} contatos pendentes
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
