import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { clienteApi } from '@/lib/api';
import { ClienteFiltros, ClienteListResponse, CreateClientePayload, UpdateClientePayload } from '@/types/cliente';

export function useClientes(filtros: ClienteFiltros = {}, page = 1, limit = 50) {
  return useQuery({
    queryKey: ['clientes', filtros.nome, filtros.cnpjCpf, filtros.situacao, filtros.ativo, page, limit],
    queryFn: () => clienteApi.getClientes(filtros, page, limit),
    staleTime: 30000,
    placeholderData: (prev: ClienteListResponse | undefined) => prev,
  });
}

export function useCidadesSearch(query: string) {
  return useQuery({
    queryKey: ['clientes', 'endereco', 'cidades', query],
    queryFn: () => clienteApi.getCidades(query),
    enabled: query.trim().length >= 2,
    staleTime: 60000,
  });
}

export function useBairrosSearch(query: string) {
  return useQuery({
    queryKey: ['clientes', 'endereco', 'bairros', query],
    queryFn: () => clienteApi.getBairros(query),
    enabled: query.trim().length >= 2,
    staleTime: 60000,
  });
}

export function useLogradourosSearch(query: string) {
  return useQuery({
    queryKey: ['clientes', 'endereco', 'logradouros', query],
    queryFn: () => clienteApi.getLogradouros(query),
    enabled: query.trim().length >= 2,
    staleTime: 60000,
  });
}

export function useDebounce<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function useClienteCount() {
  return useQuery({
    queryKey: ['clientes', 'count'],
    queryFn: () => clienteApi.getClienteCount(),
    staleTime: 60000,
  });
}

export function useClienteById(codParc: number | null) {
  return useQuery({
    queryKey: ['clientes', 'detail', codParc],
    queryFn: () => clienteApi.getClienteById(codParc!),
    enabled: !!codParc,
  });
}

export function useCriarCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClientePayload) => clienteApi.criarCliente(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });
}

export function useAtualizarCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ codParc, payload }: { codParc: number; payload: UpdateClientePayload }) =>
      clienteApi.atualizarCliente(codParc, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['clientes', 'detail', variables.codParc] });
    },
  });
}

export function useDeletarCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (codParc: number) => clienteApi.deletarCliente(codParc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });
}

export function useValidarDocumento(cnpjCpf: string, codParc?: number) {
  const cleaned = (cnpjCpf || '').replace(/\D/g, '');
  const isValidLength = cleaned.length === 11 || cleaned.length === 14;

  return useQuery({
    queryKey: ['clientes', 'validar-documento', cleaned, codParc],
    queryFn: () => clienteApi.validarDocumento(cleaned, codParc),
    enabled: isValidLength,
    staleTime: 10000,
  });
}

export function useEmpresasParceiro(codParc: number | null) {
  return useQuery({
    queryKey: ['clientes', codParc, 'empresas'],
    queryFn: () => clienteApi.getEmpresasParceiro(codParc!),
    enabled: !!codParc,
    staleTime: 10000,
  });
}

export function useEmpresasDisponiveis() {
  return useQuery({
    queryKey: ['empresas', 'disponiveis'],
    queryFn: () => clienteApi.getEmpresasDisponiveis(),
    staleTime: 300000,
  });
}

export function useTabelasPrecoDisponiveis() {
  return useQuery({
    queryKey: ['tabelas-preco', 'disponiveis'],
    queryFn: () => clienteApi.getTabelasPrecoDisponiveis(),
    staleTime: 300000,
  });
}

export function useAnexosParceiro(codParc: number | null) {
  return useQuery({
    queryKey: ['clientes', codParc, 'anexos'],
    queryFn: () => clienteApi.getAnexosParceiro(codParc!),
    enabled: !!codParc,
    staleTime: 10000,
  });
}

export function useSalvarAnexoParceiro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ codParc, payload }: { codParc: number; payload: { nomeArquivo: string; descricao?: string } }) =>
      clienteApi.salvarAnexoParceiro(codParc, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clientes', variables.codParc, 'anexos'] });
    },
  });
}

export function useUploadAnexoParceiro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ codParc, arquivo, descricao }: { codParc: number; arquivo: File; descricao?: string }) =>
      clienteApi.uploadAnexoParceiro(codParc, arquivo, descricao),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clientes', variables.codParc, 'anexos'] });
    },
  });
}

export function useRemoverAnexoParceiro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ codParc, nuAttach, fonte, descricao }: { codParc: number; nuAttach: number; fonte: string; descricao?: string }) =>
      clienteApi.removerAnexoParceiro(codParc, nuAttach, fonte, descricao),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clientes', variables.codParc, 'anexos'] });
    },
  });
}
