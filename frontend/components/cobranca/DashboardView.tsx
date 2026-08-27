'use client';

import { useState } from 'react';
import { useKpisAtendimento, useMetasPerformance } from '@/hooks/useCobranca';
import { useEmpresasDisponiveis } from '@/hooks/useCliente';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  ArrowRight,
  Kanban,
  CheckCircle2,
  Target,
  Award,
  DollarSign,
  TrendingUp,
  Building2,
  CalendarDays,
  Sparkles,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { DashboardCards } from '@/components/cobranca/DashboardCards';
import { WhatsAppTemplatesConfigModal } from './WhatsAppTemplatesConfigModal';

const MESES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

const ANOS = [2024, 2025, 2026, 2027];

export function DashboardView() {
  const router = useRouter();
  const now = new Date();

  // Filtros
  const [mes, setMes] = useState<number>(now.getMonth() + 1);
  const [ano, setAno] = useState<number>(now.getFullYear());
  const [codemp, setCodemp] = useState<number | undefined>(undefined);
  const [whatsAppTemplatesOpen, setWhatsAppTemplatesOpen] = useState(false);

  const { data: atendimentoData, isLoading: isLoadingKpis } = useKpisAtendimento();
  const { data: metasData, isLoading: isLoadingMetas } = useMetasPerformance({ mes, ano, codemp });
  const { data: empresasLista, isLoading: isLoadingEmpresas } = useEmpresasDisponiveis();

  if (isLoadingKpis || !atendimentoData) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-gray-500">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        <p className="text-xs font-medium">Carregando indicadores do Dashboard...</p>
      </div>
    );
  }

  const { kpis, pendentes, resolvidos, total } = atendimentoData;
  const pctResolvidos = total > 0 ? Math.round((resolvidos / total) * 100) : 0;

  const totaisMetas = metasData?.totais || {
    totalRecebido: 0,
    totalMeta: 0,
    totalPremio: 0,
    percAtingidoGlobal: 0,
  };

  // Cálculos para o Assistente de Atingimento de Meta
  const metaTotal = totaisMetas.totalMeta;
  const recebidoTotal = totaisMetas.totalRecebido;
  const metaRestante = Math.max(0, metaTotal - recebidoTotal);
  const valorCobravel = kpis.valorEmAberto || 0;

  // Porcentagem da carteira em aberto necessária para bater a meta restante
  const pctConversaoNecessaria =
    metaRestante > 0 && valorCobravel > 0
      ? Math.round((metaRestante / valorCobravel) * 100)
      : metaRestante === 0
      ? 0
      : 100;

  const metaAtingida = metaTotal > 0 && recebidoTotal >= metaTotal;
  const possuiCarteiraSuficiente = valorCobravel >= metaRestante;

  const handleCardClick = (filter: 'vencidos' | 'avencer' | 'total' | null) => {
    if (filter) {
      router.push(`/cobranca/fila?filtro=${filter}`);
    } else {
      router.push('/cobranca/fila');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header do Dashboard */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard de Cobrança</h1>
          <p className="text-xs text-gray-500">
            Acompanhamento de metas de arrecadação, prêmios e atendimentos do dia.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWhatsAppTemplatesOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
            Templates WhatsApp
          </button>

          <button
            onClick={() => router.push('/cobranca/fila')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
          >
            <Kanban className="h-3.5 w-3.5" />
            Ir para Fila de Cobrança
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Cards de KPIs Principais */}
      <div>
        <DashboardCards onCardClick={handleCardClick} />
      </div>

      {/* Painel do Meio: Progresso dos Atendimentos + Assistente de Atingimento de Meta */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Card 1: Progresso dos Atendimentos Hoje */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900">Progresso dos Atendimentos Hoje</h3>
                <p className="text-[11px] text-gray-500">Registros em TGFTEL no dia de hoje</p>
              </div>
            </div>
            <span className="text-base font-bold text-green-600">{pctResolvidos}%</span>
          </div>

          <div className="mt-3 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-gray-600">
              <span>{resolvidos} concluídos de {total} agendados</span>
              <span className="font-semibold text-orange-600">{pendentes} pendentes</span>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                style={{ width: `${pctResolvidos}%` }}
              />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-2">
                <p className="text-[10px] text-gray-400">Total Hoje</p>
                <p className="mt-0.5 text-xs font-bold text-gray-800">{total}</p>
              </div>
              <div className="rounded-lg border border-green-100 bg-green-50 p-2">
                <p className="text-[10px] font-medium text-green-600">Resolvidos</p>
                <p className="mt-0.5 text-xs font-bold text-green-700">{resolvidos}</p>
              </div>
              <div className="rounded-lg border border-orange-100 bg-orange-50 p-2">
                <p className="text-[10px] font-medium text-orange-600">Pendentes</p>
                <p className="mt-0.5 text-xs font-bold text-orange-700">{pendentes}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Plano para Atingimento da Meta (Substituindo Composição da Carteira) */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900">Oportunidades para Atingir a Meta</h3>
                <p className="text-[11px] text-gray-500">Comparação entre Meta Restante e Saldo Cobrável</p>
              </div>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${metaAtingida ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
              {metaAtingida ? 'Meta Concluída 🎉' : `Faltam ${formatCurrency(metaRestante)}`}
            </span>
          </div>

          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-purple-100 bg-purple-50/50 p-2.5">
                <p className="text-[10px] font-medium text-purple-700">Meta Restante</p>
                <p className="mt-0.5 text-sm font-bold text-purple-950">{formatCurrency(metaRestante)}</p>
                <p className="text-[10px] text-purple-600">Para atingir 100% no mês</p>
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-2.5">
                <p className="text-[10px] font-medium text-blue-700">Saldo Cobrável em Carteira</p>
                <p className="mt-0.5 text-sm font-bold text-blue-950">{formatCurrency(valorCobravel)}</p>
                <p className="text-[10px] text-blue-600">Títulos disponíveis em aberto</p>
              </div>
            </div>

            {/* Alerta de Estratégia e Conversão */}
            <div className={`rounded-lg border p-2.5 text-xs flex items-start gap-2.5 ${
              metaAtingida
                ? 'border-green-200 bg-green-50 text-green-800'
                : possuiCarteiraSuficiente
                ? 'border-blue-200 bg-blue-50/70 text-blue-900'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}>
              {metaAtingida ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
              ) : possuiCarteiraSuficiente ? (
                <TrendingUp className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                {metaAtingida ? (
                  <p className="font-semibold text-[11px]">
                    Parabéns! A meta mensal já foi atingida. Continue arrecadando para alavancar seus prêmios!
                  </p>
                ) : possuiCarteiraSuficiente ? (
                  <p className="text-[11px] leading-relaxed">
                    Você precisa converter apenas <strong className="font-extrabold text-blue-700">{pctConversaoNecessaria}%</strong> do seu saldo em aberto para bater a meta deste mês!
                  </p>
                ) : (
                  <p className="text-[11px] leading-relaxed">
                    A carteira em aberto atual é menor que a meta restante. Foco recomendado em <strong>renegociações</strong> e regravação de títulos.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Painel do Dashboard: Metas e Performance por Faixa de Atraso */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
        {/* Cabeçalho do Painel e Seletor de Filtros Dinâmicos */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Metas e Performance de Arrecadação</h2>
              <p className="text-[11px] text-gray-500">
                Acompanhamento por faixa de atraso, metas corporativas (`AD_METASFIN`) e prêmios.
              </p>
            </div>
          </div>

          {/* Filtros de Mês, Ano e Empresa (TSIEMP) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Mês */}
            <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs">
              <CalendarDays className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-gray-600 font-medium">Mês:</span>
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="bg-transparent font-bold text-gray-900 focus:outline-none cursor-pointer text-xs"
              >
                {MESES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Seletor de Ano */}
            <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs">
              <span className="text-gray-600 font-medium">Ano:</span>
              <select
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="bg-transparent font-bold text-gray-900 focus:outline-none cursor-pointer text-xs"
              >
                {ANOS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* Seletor de Empresa (Consulta TSIEMP) */}
            <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs">
              <Building2 className="h-3.5 w-3.5 text-gray-500" />
              <select
                value={codemp ?? ''}
                onChange={(e) => setCodemp(e.target.value ? Number(e.target.value) : undefined)}
                className="bg-transparent font-bold text-gray-900 focus:outline-none cursor-pointer text-xs max-w-[180px] truncate"
              >
                <option value="">Todas as Empresas</option>
                {isLoadingEmpresas ? (
                  <option disabled>Carregando TSIEMP...</option>
                ) : (
                  empresasLista?.map((emp) => (
                    <option key={emp.codEmp} value={emp.codEmp}>
                      {emp.nomeEmp}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Resumo Global de Metas (Cards Compactos) */}
        {isLoadingMetas ? (
          <div className="flex h-24 items-center justify-center gap-2 text-xs text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
            Calculando metas e prêmios do período...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {/* Card Total Recebido */}
              <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-blue-700">Total Arrecadado</p>
                  <DollarSign className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <p className="mt-1 text-base font-extrabold text-blue-950">
                  {formatCurrency(totaisMetas.totalRecebido)}
                </p>
                <p className="text-[10px] text-blue-600">{metasData?.dtini} a {metasData?.dtfim}</p>
              </div>

              {/* Card Total Meta */}
              <div className="rounded-lg border border-purple-100 bg-purple-50/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-purple-700">Meta Geral Mês</p>
                  <Target className="h-3.5 w-3.5 text-purple-600" />
                </div>
                <p className="mt-1 text-base font-extrabold text-purple-950">
                  {formatCurrency(totaisMetas.totalMeta)}
                </p>
                <p className="text-[10px] text-purple-600">Meta AD_METASFIN</p>
              </div>

              {/* Card Atingimento Global */}
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-emerald-700">% Atingimento Global</p>
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <p className="mt-1 text-base font-extrabold text-emerald-950">
                  {totaisMetas.percAtingidoGlobal}%
                </p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-emerald-200">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-500"
                    style={{ width: `${Math.min(totaisMetas.percAtingidoGlobal, 100)}%` }}
                  />
                </div>
              </div>

              {/* Card Prêmio Total */}
              <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-amber-700">Prêmio Calculado</p>
                  <Award className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <p className="mt-1 text-base font-extrabold text-amber-950">
                  {formatCurrency(totaisMetas.totalPremio)}
                </p>
                <p className="text-[10px] text-amber-600">Comissão de arrecadação</p>
              </div>
            </div>

            {/* Tabela Detalhada por Regra / Faixa de Atraso */}
            <div>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Detalhamento por Regra de Cobrança / Faixa de Atraso
              </h3>

              {!metasData?.items || metasData.items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-xs text-gray-500">
                  Nenhum registro de meta ou recebimento encontrado para o período selecionado.
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-gray-200 bg-gray-50 text-gray-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2">Regra / Faixa</th>
                        <th className="px-3 py-2 text-right">Valor Arrecadado</th>
                        <th className="px-3 py-2 text-right">Meta (R$)</th>
                        <th className="px-3 py-2 text-center">% Atingido</th>
                        <th className="px-3 py-2 text-right">% Com.</th>
                        <th className="px-3 py-2 text-right">Prêmio (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {metasData.items.map((item) => {
                        const isReneg = item.regra.includes('RENEGOCIADOS');
                        const pctClass =
                          item.percAtingido >= 100
                            ? 'bg-green-100 text-green-800'
                            : item.percAtingido >= 75
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800';

                        return (
                          <tr key={item.regra} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-3 py-2.5 font-bold text-gray-900 flex items-center gap-2">
                              <span className={`inline-block h-2 w-2 rounded-full ${isReneg ? 'bg-purple-500' : 'bg-blue-600'}`} />
                              {item.regra}
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-gray-900">
                              {formatCurrency(item.recebido)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium text-gray-500">
                              {formatCurrency(item.meta)}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${pctClass}`}>
                                {item.percAtingido}%
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-gray-700">
                              {item.percCom}%
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-emerald-700">
                              {formatCurrency(item.premio)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t border-gray-200 bg-gray-50 font-bold text-gray-900 text-xs">
                      <tr>
                        <td className="px-3 py-2">Total Consolidado</td>
                        <td className="px-3 py-2 text-right text-blue-700">{formatCurrency(totaisMetas.totalRecebido)}</td>
                        <td className="px-3 py-2 text-right text-purple-700">{formatCurrency(totaisMetas.totalMeta)}</td>
                        <td className="px-3 py-2 text-center text-emerald-700">{totaisMetas.percAtingidoGlobal}%</td>
                        <td className="px-3 py-2 text-right">-</td>
                        <td className="px-3 py-2 text-right text-amber-700">{formatCurrency(totaisMetas.totalPremio)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {whatsAppTemplatesOpen && (
        <WhatsAppTemplatesConfigModal
          open={whatsAppTemplatesOpen}
          onClose={() => setWhatsAppTemplatesOpen(false)}
        />
      )}
    </div>
  );
}
