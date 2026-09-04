import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FilaFilterRange {
  id: string;
  label: string;
  diaInicial: number; // Menor dia de atraso (ex: 1 ou 8 ou 31)
  diaFinal: number | null; // Maior dia de atraso (ex: 7 ou 30, ou null para sem limite / '> diaInicial')
  cor?: 'emerald' | 'amber' | 'orange' | 'rose' | 'blue' | 'purple' | 'gray';
  padrao?: boolean;
}

export const FILTRO_TODOS_ID = 'todos';

export const FILTROS_PADRAO: FilaFilterRange[] = [
  {
    id: FILTRO_TODOS_ID,
    label: 'Todos os Clientes',
    diaInicial: 0,
    diaFinal: null,
    cor: 'emerald',
    padrao: true,
  },
  {
    id: 'atraso-1-7',
    label: 'Atraso Leve (1 a 7 dias)',
    diaInicial: 1,
    diaFinal: 7,
    cor: 'amber',
    padrao: true,
  },
  {
    id: 'atraso-8-30',
    label: 'Atraso Médio (8 a 30 dias)',
    diaInicial: 8,
    diaFinal: 30,
    cor: 'orange',
    padrao: true,
  },
  {
    id: 'atraso-gt-30',
    label: 'Atraso Crítico (> 30 dias)',
    diaInicial: 31,
    diaFinal: null,
    cor: 'rose',
    padrao: true,
  },
  {
    id: 'em-dia-0',
    label: 'Vencendo Hoje / Em dia (0 dias)',
    diaInicial: 0,
    diaFinal: 0,
    cor: 'blue',
    padrao: true,
  },
];

interface WhatsAppFilaFilterState {
  filtros: FilaFilterRange[];
  filtroAtivoId: string;
  setFiltroAtivoId: (id: string) => void;
  addFiltro: (novo: Omit<FilaFilterRange, 'id' | 'padrao'>) => void;
  updateFiltro: (id: string, updated: Partial<FilaFilterRange>) => void;
  removeFiltro: (id: string) => void;
  resetToDefaults: () => void;
}

export const useWhatsAppFilaFilterStore = create<WhatsAppFilaFilterState>()(
  persist(
    (set) => ({
      filtros: FILTROS_PADRAO,
      filtroAtivoId: FILTRO_TODOS_ID,

      setFiltroAtivoId: (id: string) => set({ filtroAtivoId: id }),

      addFiltro: (novo) =>
        set((state) => {
          const id = 'filtro-' + Date.now();
          const item: FilaFilterRange = {
            ...novo,
            id,
            padrao: false,
          };
          return {
            filtros: [...state.filtros, item],
            filtroAtivoId: id,
          };
        }),

      updateFiltro: (id, updated) =>
        set((state) => ({
          filtros: state.filtros.map((f) =>
            f.id === id ? { ...f, ...updated } : f
          ),
        })),

      removeFiltro: (id) =>
        set((state) => {
          if (id === FILTRO_TODOS_ID) return state;
          const novosFiltros = state.filtros.filter((f) => f.id !== id);
          const fallbackId = novosFiltros[0]?.id || FILTRO_TODOS_ID;
          return {
            filtros: novosFiltros,
            filtroAtivoId:
              state.filtroAtivoId === id ? fallbackId : state.filtroAtivoId,
          };
        }),

      resetToDefaults: () =>
        set({
          filtros: FILTROS_PADRAO,
          filtroAtivoId: FILTRO_TODOS_ID,
        }),
    }),
    {
      name: 'whatsapp-fila-filters-storage',
    }
  )
);
