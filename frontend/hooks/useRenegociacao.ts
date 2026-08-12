import { useMutation, useQueryClient } from '@tanstack/react-query';
import { renegociacaoApi } from '@/lib/api';
import { RenegociacaoParams, ConfirmarPayload } from '@/types/renegociacao';

export function useSimularRenegociacao() {
  return useMutation({
    mutationFn: (params: RenegociacaoParams) => renegociacaoApi.simular(params),
  });
}

export function useConfirmarRenegociacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ConfirmarPayload) => renegociacaoApi.confirmar(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cobranca'] });
    },
  });
}
