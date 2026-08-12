'use client';

import { useState } from 'react';
import { useAgendaHoje } from '@/hooks/useAgenda';
import { Agendamento } from '@/types/agenda';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, ArrowDownCircle, ArrowUpCircle, CheckCircle2, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 50;

export function AgendaList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isFetching } = useAgendaHoje({
    page,
    limit: PAGE_SIZE,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Carregando agenda...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-700">Erro ao carregar agenda</p>
        <p className="text-sm text-red-500 mt-1">
          {error instanceof Error ? error.message : 'Verifique se o backend está rodando'}
        </p>
      </div>
    );
  }

  const agendamentos = data?.data ?? [];

  if (agendamentos.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <Calendar className="mx-auto h-12 w-12 text-gray-300" />
        <p className="mt-4 text-gray-500 font-medium">
          Nenhum vencimento para hoje
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {data?.dataConsulta}
        </p>
      </div>
    );
  }

  const emAberto = agendamentos.filter((a) => !a.baixado);
  const baixados = agendamentos.filter((a) => a.baixado);
  const totalReceber = data?.totalReceber ?? 0;
  const totalPagar = data?.totalPagar ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? page;
  const totalRegistros = data?.total ?? 0;

  const paginaInicial = (currentPage - 1) * PAGE_SIZE + 1;
  const paginaFinal = Math.min(currentPage * PAGE_SIZE, totalRegistros);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Total no período</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totalRegistros}</p>
          <p className="text-xs text-gray-400">{baixados.length} já baixados nesta página</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5 text-green-600" />
            <p className="text-xs font-medium text-green-700">A Receber</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-green-700">{formatCurrency(totalReceber)}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-red-600" />
            <p className="text-xs font-medium text-red-700">A Pagar</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-red-700">{formatCurrency(totalPagar)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-gray-400" />
            <p className="text-xs font-medium text-gray-500">Vencendo nesta página</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">{emAberto.length}</p>
          <p className="text-xs text-gray-400">títulos em aberto</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="relative overflow-x-auto">
          {isFetching && (
            <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              Atualizando...
            </div>
          )}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Parceiro
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Documento
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Vencimento
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Histórico
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Tipo
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Valor em Aberto
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {agendamentos.map((item: Agendamento) => (
                <tr
                  key={item.nuFin}
                  className={item.baixado ? 'opacity-50' : 'hover:bg-gray-50'}
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    {item.baixado ? (
                      <Badge variant="success">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Baixado
                      </Badge>
                    ) : (
                      <Badge variant="warning">
                        <Clock className="mr-1 h-3 w-3" />
                        Vence hoje
                      </Badge>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {item.nomeParceiro}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {item.numnota || '-'}
                    {item.desdobramento && (
                      <span className="ml-1 text-xs text-gray-400">/{item.desdobramento}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {formatDate(item.dataVencimento)}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-600">
                    {item.historico || '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                        item.tipo === 'A RECEBER'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {item.tipo}
                    </span>
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right text-sm font-bold ${
                      item.baixado
                        ? 'text-gray-400'
                        : item.tipo === 'A RECEBER'
                          ? 'text-green-600'
                          : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(item.baixado ? item.valor : item.valorEmAberto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 sm:flex-row">
          <p className="text-xs text-gray-500">
            Exibindo <span className="font-medium text-gray-700">{paginaInicial}</span>–
            <span className="font-medium text-gray-700">{paginaFinal}</span> de{' '}
            <span className="font-medium text-gray-700">{totalRegistros}</span> títulos
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isFetching}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <span className="text-sm text-gray-600">
              Página <span className="font-medium text-gray-900">{currentPage}</span> de{' '}
              <span className="font-medium text-gray-900">{totalPages}</span>
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={currentPage >= totalPages || isFetching}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
