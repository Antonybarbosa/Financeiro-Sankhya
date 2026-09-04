'use client';

import { useState, useMemo } from 'react';
import { useAtendimentosHoje, useConcluirContato, useMarcarPendenteContato } from '@/hooks/useCobranca';
import { AtendimentoHojeItem } from '@/types/cobranca';
import { ParceiroCard } from '../ParceiroCard';
import { ParceiroDetailPanel } from '../ParceiroDetailPanel';
import { WhatsAppSendModal } from '../WhatsAppSendModal';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Inbox, ListFilter, ChevronDown } from 'lucide-react';

const PAGE_SIZE = 20;

export function MasterDetailView() {
  const [selected, setSelected] = useState<AtendimentoHojeItem | null>(null);
  const [whatsAppTarget, setWhatsAppTarget] = useState<{
    parceiroId: number;
    parceiroNome: string;
    telefone?: string | null;
  } | null>(null);
  const [buscaInput, setBuscaInput] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const {
    data,
    isLoading,
    isError,
  } = useAtendimentosHoje();

  const concluirContato = useConcluirContato();
  const marcarPendenteContato = useMarcarPendenteContato();

  const allItems = useMemo(() => {
    if (!data) return [];
    return data.items;
  }, [data]);

  const filtrados = useMemo(() => {
    if (!buscaInput) return allItems;
    const buscaLower = buscaInput.toLowerCase();
    return allItems.filter(item => item.parceiroNome.toLowerCase().includes(buscaLower));
  }, [allItems, buscaInput]);

  const visiveis = filtrados.slice(0, limit);
  const temMais = filtrados.length > limit;

  const total = data?.total ?? 0;
  const pendentes = data?.pendentes ?? 0;
  const resolvidos = data?.resolvidos ?? 0;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Carregando fila de cobrança...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="font-medium text-red-700">Erro ao carregar a fila</p>
        <p className="mt-1 text-sm text-red-500">
          Verifique se o backend está rodando em localhost:3001
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-220px)] gap-4 overflow-hidden">
      {/* Master - lista de parceiros */}
      <div className="flex w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white lg:w-96 lg:shrink-0">
        {/* Search + filters */}
        <div className="border-b border-gray-200 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none select-none" />
            <Input
              placeholder="Buscar por nome do parceiro..."
              value={buscaInput}
              onChange={(e) => {
                setBuscaInput(e.target.value);
                setLimit(PAGE_SIZE);
              }}
              className="pl-9 cursor-text select-text pointer-events-auto"
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
            <span>
              {filtrados.length} de {total} atendimentos
            </span>
            <span>{pendentes} pendentes · {resolvidos} resolvidos</span>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {visiveis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Inbox className="h-10 w-10" />
              <p className="mt-2 text-sm">Nenhum parceiro encontrado</p>
            </div>
          ) : (
            <>
              {visiveis.map((item) => (
                <ParceiroCard
                  key={item.parceiroId}
                  item={item}
                  onClick={() => setSelected(item)}
                  isSelected={selected?.parceiroId === item.parceiroId}
                  onConcluir={(nurel) => concluirContato.mutate(nurel)}
                  onReabrir={(nurel) => marcarPendenteContato.mutate(nurel)}
                  onWhatsAppClick={(cardItem) =>
                    setWhatsAppTarget({
                      parceiroId: cardItem.parceiroId,
                      parceiroNome: cardItem.parceiroNome || cardItem.razaoSocial || '',
                      telefone: cardItem.telefone,
                    })
                  }
                />
              ))}
              {temMais && (
                <button
                  onClick={() => setLimit((l) => l + PAGE_SIZE)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  Carregar mais ({filtrados.length - limit} restantes)
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className="hidden flex-1 overflow-hidden rounded-xl border border-gray-200 lg:block">
        {selected ? (
          <ParceiroDetailPanel
            item={selected}
            onClose={() => setSelected(null)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-gray-400">
            <ListFilter className="h-12 w-12" />
            <p className="mt-3 text-sm font-medium">Selecione um parceiro</p>
            <p className="mt-1 text-xs">para ver detalhes, títulos e registrar contatos</p>
          </div>
        )}
      </div>

      {/* Mobile detail as overlay */}
      {selected && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelected(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-gray-200 bg-white">
            <ParceiroDetailPanel item={selected} onClose={() => setSelected(null)} />
          </div>
        </div>
      )}

      {whatsAppTarget && (
        <WhatsAppSendModal
          open={!!whatsAppTarget}
          onClose={() => setWhatsAppTarget(null)}
          parceiroId={whatsAppTarget.parceiroId}
          parceiroNome={whatsAppTarget.parceiroNome}
          telefone={whatsAppTarget.telefone}
        />
      )}
    </div>
  );
}
