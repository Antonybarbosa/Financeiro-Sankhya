import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { agendaApi } from '@/lib/api';
import { AgendaParams } from '@/types/agenda';

export function useAgendaHoje(params: AgendaParams = {}) {
  return useQuery({
    queryKey: ['agenda', 'hoje', params],
    queryFn: () => agendaApi.getAgendaHoje(params),
    placeholderData: keepPreviousData,
  });
}
