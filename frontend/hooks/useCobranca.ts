import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cobrancaApi } from '@/lib/api';
import { CreateContatoPayload, FilaCobrancaParams } from '@/types/cobranca';

export function useKpis() {
  return useQuery({
    queryKey: ['cobranca', 'kpis'],
    queryFn: () => cobrancaApi.getKpis(),
    refetchInterval: 60000,
  });
}

export function useKpisAtendimento() {
  return useQuery({
    queryKey: ['cobranca', 'atendimento', 'hoje'],
    queryFn: () => cobrancaApi.getAtendimentosHoje(),
    refetchInterval: 30000,
    select: (data) => ({
      kpis: data.kpis,
      pendentes: data.pendentes,
      resolvidos: data.resolvidos,
      total: data.total,
    }),
  });
}

export function useAtendimentosHoje() {
  return useQuery({
    queryKey: ['cobranca', 'atendimento', 'hoje'],
    queryFn: () => cobrancaApi.getAtendimentosHoje(),
    refetchInterval: 30000,
  });
}

export function useFilaCobranca(baseParams: FilaCobrancaParams = {}) {
  return useInfiniteQuery({
    queryKey: ['cobranca', 'fila', baseParams.apenasVencidos, baseParams.busca],
    queryFn: ({ pageParam }) =>
      cobrancaApi.getFila({ ...baseParams, page: pageParam, limit: baseParams.limit ?? 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    refetchInterval: 60000,
  });
}

export function useTitulosPorCliente(clienteId: number | null) {
  return useQuery({
    queryKey: ['cobranca', 'titulos', 'cliente', clienteId],
    queryFn: () => cobrancaApi.getTitulosPorCliente(clienteId!),
    enabled: !!clienteId,
  });
}

export function useBoleto(tituloId: number | null) {
  return useQuery({
    queryKey: ['cobranca', 'boleto', tituloId],
    queryFn: () => cobrancaApi.getBoleto(tituloId!),
    enabled: !!tituloId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useContatosPorParceiro(parceiroId: number | null) {
  return useQuery({
    queryKey: ['cobranca', 'contatos', 'parceiro', parceiroId],
    queryFn: () => cobrancaApi.getContatosPorParceiro(parceiroId!),
    enabled: !!parceiroId,
  });
}

export function useContatosPendentes() {
  return useQuery({
    queryKey: ['cobranca', 'contatos', 'pendentes'],
    queryFn: () => cobrancaApi.getContatosPendentes(),
  });
}

export function useCriarContato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateContatoPayload) => cobrancaApi.criarContato(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['cobranca', 'contatos', 'parceiro', variables.parceiroId],
      });
      queryClient.invalidateQueries({ queryKey: ['cobranca', 'contatos', 'pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['cobranca', 'kpis'] });
    },
  });
}

export function useConcluirContato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cobrancaApi.concluirContato(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cobranca', 'contatos'] });
      queryClient.invalidateQueries({ queryKey: ['cobranca', 'kpis'] });
      queryClient.invalidateQueries({ queryKey: ['cobranca', 'atendimento', 'hoje'] });
    },
  });
}

export function useMarcarPendenteContato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cobrancaApi.marcarPendenteContato(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cobranca', 'contatos'] });
      queryClient.invalidateQueries({ queryKey: ['cobranca', 'kpis'] });
      queryClient.invalidateQueries({ queryKey: ['cobranca', 'atendimento', 'hoje'] });
    },
  });
}
