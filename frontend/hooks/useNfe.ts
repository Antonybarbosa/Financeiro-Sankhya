import { useQuery } from '@tanstack/react-query';
import { nfeApi } from '@/lib/api';

export function useNfeDados(
  valor: number | null,
  tipo: 'nunota' | 'numnota' = 'numnota',
) {
  return useQuery({
    queryKey: ['nfe', 'dados', tipo, valor],
    queryFn: () =>
      tipo === 'numnota'
        ? nfeApi.getDadosByNumNota(valor!)
        : nfeApi.getDadosByNunota(valor!),
    enabled: !!valor,
    staleTime: 300000,
  });
}
