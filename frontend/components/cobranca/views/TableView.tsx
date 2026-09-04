'use client';

import { useState, useMemo, useEffect, Fragment } from 'react';
import { useFilaCobranca, useTitulosPorCliente } from '@/hooks/useCobranca';
import { FilaItem, Titulo } from '@/types/cobranca';
import {
  formatCurrency,
  formatPhone,
  formatDate,
  diasAtrasoLabel,
  prioridadeLabel,
  formatWhatsAppLink,
} from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ParceiroDetailPanel } from '../ParceiroDetailPanel';
import { ParceiroDadosExtras } from '../ParceiroDadosExtras';
import { RenegociacaoModal } from '../RenegociacaoModal';
import { Dialog, DialogCloseButton } from '@/components/ui/dialog';
import { BoletoViewer } from '../BoletoViewer';
import { WhatsAppSendModal } from '../WhatsAppSendModal';
import {
  Loader2,
  Search,
  ArrowUpDown,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Handshake,
  Barcode,
} from 'lucide-react';

type SortField = 'valorVencido' | 'diasAtrasoMax' | 'prioridade' | 'parceiroNome';
type SortDir = 'asc' | 'desc';

interface TableViewProps {
  apenasVencidos?: boolean;
}

interface BoletoParceiroModalProps {
  parceiroId: number;
  parceiroNome: string;
  onClose: () => void;
}

function StatusAtendimentoBadge({ pendente }: { pendente: boolean | null | undefined }) {
  if (pendente === null || pendente === undefined) {
    return <span className="text-xs text-gray-300">—</span>;
  }
  return (
    <Badge variant={pendente ? 'warning' : 'success'}>
      {pendente ? 'Pendente' : 'Resolvido'}
    </Badge>
  );
}

function BoletoParceiroModal({ parceiroId, parceiroNome, onClose }: BoletoParceiroModalProps) {
  const { data: titulos, isLoading } = useTitulosPorCliente(parceiroId);
  const [tituloSelecionado, setTituloSelecionado] = useState<number | null>(null);

  const comBoleto = (titulos || []).filter(
    (t) => t.isEmAberto && (t.linhaDigitavel || t.codigoBarras),
  );

  // Com um título escolhido, troca para o visualizador de boleto
  if (tituloSelecionado) {
    return (
      <BoletoViewer
        tituloId={tituloSelecionado}
        onClose={() => setTituloSelecionado(null)}
      />
    );
  }

  return (
    <Dialog open onClose={onClose} className="max-w-xl">
      <DialogCloseButton onClose={onClose} />
      <div className="px-6 py-4">
        <h3 className="text-lg font-bold text-gray-900">Boletos — {parceiroNome}</h3>
        <p className="mt-0.5 text-xs text-gray-400">
          Selecione o título para visualizar o boleto
        </p>

        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando títulos...
          </div>
        ) : comBoleto.length === 0 ? (
          <div className="py-8 text-center">
            <Barcode className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">
              Nenhum título em aberto com boleto gerado
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {comBoleto.map((titulo: Titulo) => (
              <div
                key={titulo.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 shadow-xs hover:border-gray-300 transition-all"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-gray-900 font-mono">
                      {titulo.numero ? `#${titulo.numero}` : `NUFIN ${titulo.id}`}
                    </span>
                    {titulo.desdobramento && titulo.desdobramento !== '0' && (
                      <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-700">
                        Parc. {titulo.desdobramento}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-600 font-medium">
                    Vencimento: <span className="font-bold text-gray-900">{formatDate(titulo.dataVencimento)}</span> ·{' '}
                    <span className="font-extrabold text-indigo-950">{formatCurrency(titulo.valorEmAberto)}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTituloSelecionado(titulo.id)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-indigo-700 cursor-pointer"
                >
                  <Barcode className="h-3.5 w-3.5" />
                  Ver Boleto
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}

export function TableView({ apenasVencidos }: TableViewProps) {
  const [selected, setSelected] = useState<FilaItem | null>(null);
  const [whatsAppTarget, setWhatsAppTarget] = useState<{
    parceiroId: number;
    parceiroNome: string;
    telefone?: string | null;
  } | null>(null);
  const [renegociarItem, setRenegociarItem] = useState<FilaItem | null>(null);
  const [boletoItem, setBoletoItem] = useState<FilaItem | null>(null);
  const [expandidoId, setExpandidoId] = useState<number | null>(null);
  const [buscaInput, setBuscaInput] = useState('');
  const [buscaApi, setBuscaApi] = useState('');
  const [sortField, setSortField] = useState<SortField>('prioridade');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    const timer = setTimeout(() => setBuscaApi(buscaInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [buscaInput]);

  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useFilaCobranca({ apenasVencidos, busca: buscaApi || undefined });

  const allItems = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((p) => p.items);
  }, [data]);

  const sorted = useMemo(() => {
    const result = [...allItems];
    result.sort((a, b) => {
      let cmp: number;
      if (sortField === 'parceiroNome') {
        cmp = a.parceiroNome.localeCompare(b.parceiroNome);
      } else {
        cmp = (a[sortField] as number) - (b[sortField] as number);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [allItems, sortField, sortDir]);

  const total = data?.pages[0]?.total ?? 0;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  return (
    <>
      <div className="space-y-3">
        {/* Search */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none select-none" />
            <Input
              placeholder="Buscar parceiro..."
              value={buscaInput}
              onChange={(e) => setBuscaInput(e.target.value)}
              className="pl-9 cursor-text select-text pointer-events-auto"
            />
          </div>
          <span className="text-xs text-gray-400">
            {isLoading ? 'Buscando...' : `${sorted.length} de ${total} parceiros`}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    onClick={() => toggleSort('parceiroNome')}
                    className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                  >
                    <span className="inline-flex items-center gap-1">
                      Parceiro
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Contato
                  </th>
                  <th
                    onClick={() => toggleSort('diasAtrasoMax')}
                    className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                  >
                    <span className="inline-flex items-center gap-1">
                      Atraso
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Títulos
                  </th>
                  <th
                    onClick={() => toggleSort('valorVencido')}
                    className="cursor-pointer px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                  >
                    <span className="inline-flex items-center gap-1">
                      Valor Vencido
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th
                    onClick={() => toggleSort('prioridade')}
                    className="cursor-pointer px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                  >
                    <span className="inline-flex items-center gap-1">
                      Prioridade
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Atend.
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-16">
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Carregando...
                      </div>
                    </td>
                  </tr>
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-gray-400">
                      Nenhum parceiro encontrado
                    </td>
                  </tr>
                ) : (
                  sorted.map((item) => {
                    const atraso = diasAtrasoLabel(item.diasAtrasoMax);
                    const prio = prioridadeLabel(item.prioridade);
                    return (
                      <Fragment key={item.parceiroId}>
                      <tr
                        onClick={() => setSelected(item)}
                        className="cursor-pointer transition-colors hover:bg-blue-50/50"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              {item.razaoSocial || item.parceiroNome}
                            </p>
                            {(item.nomeFantasia || (item.razaoSocial && item.razaoSocial !== item.parceiroNome)) && (
                              <p className="text-xs font-medium text-gray-500">
                                {item.nomeFantasia || item.parceiroNome}
                              </p>
                            )}
                            {item.cnpjCpf && (
                              <p className="text-[11px] text-gray-400">{item.cnpjCpf}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {item.telefone ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-600">
                                {formatPhone(item.telefone)}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWhatsAppTarget({
                                    parceiroId: item.parceiroId,
                                    parceiroNome: item.parceiroNome,
                                    telefone: item.telefone,
                                  });
                                }}
                                className="text-green-600 hover:text-green-700 cursor-pointer"
                                title="Enviar WhatsApp Personalizado"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${atraso.color}`}>
                            {atraso.label}
                          </span>
                          {item.primeiroVencimento && (
                            <p className="text-xs text-gray-400">
                              {formatDate(item.primeiroVencimento)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-medium text-gray-700">
                            {item.qtdTitulos}
                          </span>
                          {item.qtdVencidos > 0 && (
                            <p className="text-xs text-red-500">{item.qtdVencidos} venc.</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm font-bold text-gray-900">
                            {formatCurrency(item.valorVencido || item.valorTotal)}
                          </p>
                          {item.valorAvencer > 0 && (
                            <p className="text-xs text-amber-500">
                              +{formatCurrency(item.valorAvencer)} a vencer
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={prio.variant as any}>{prio.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusAtendimentoBadge pendente={item.pendente} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandidoId((prev) => (prev === item.parceiroId ? null : item.parceiroId));
                              }}
                              title="Ver dados do parceiro"
                              className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                            >
                              {expandidoId === item.parceiroId ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                            {item.telefone && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWhatsAppTarget({
                                    parceiroId: item.parceiroId,
                                    parceiroNome: item.parceiroNome,
                                    telefone: item.telefone,
                                  });
                                }}
                                title="Enviar WhatsApp Personalizado"
                                className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setBoletoItem(item);
                              }}
                              title="Ver boletos dos títulos"
                              className="rounded-md p-1 text-gray-700 hover:bg-gray-100"
                            >
                              <Barcode className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenegociarItem(item);
                              }}
                              title="Renegociar títulos"
                              className="rounded-md p-1 text-indigo-600 hover:bg-indigo-50"
                            >
                              <Handshake className="h-4 w-4" />
                            </button>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </td>
                      </tr>
                      {expandidoId === item.parceiroId && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={8} className="px-4 py-3">
                            <ParceiroDadosExtras
                              razaoSocial={item.razaoSocial}
                              nomeFantasia={item.nomeFantasia}
                              tipoPessoa={item.tipoPessoa}
                              pessoFisJur={item.pessoFisJur}
                              inscricaoEstadual={item.inscricaoEstadual}
                              cnpjCpf={item.cnpjCpf}
                              logradouro={item.logradouro}
                              numeroEnd={item.numeroEnd}
                              complemento={item.complemento}
                              cep={item.cep}
                              bairro={item.bairro}
                              cidade={item.cidade}
                              uf={item.uf}
                            />
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Load more */}
          {hasNextPage && (
            <div className="border-t border-gray-100 p-3 text-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Carregar mais
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} className="max-w-3xl">
        <DialogCloseButton onClose={() => setSelected(null)} />
        {selected && <ParceiroDetailPanel item={selected} />}
      </Dialog>

      {/* Renegociacao modal */}
      {renegociarItem && (
        <RenegociacaoModal
          parceiroId={renegociarItem.parceiroId}
          parceiroNome={renegociarItem.parceiroNome}
          open={!!renegociarItem}
          onClose={() => setRenegociarItem(null)}
        />
      )}

      {/* Boleto modal */}
      {boletoItem && (
        <BoletoParceiroModal
          parceiroId={boletoItem.parceiroId}
          parceiroNome={boletoItem.parceiroNome}
          onClose={() => setBoletoItem(null)}
        />
      )}

      {/* WhatsApp modal */}
      {whatsAppTarget && (
        <WhatsAppSendModal
          open={!!whatsAppTarget}
          onClose={() => setWhatsAppTarget(null)}
          parceiroId={whatsAppTarget.parceiroId}
          parceiroNome={whatsAppTarget.parceiroNome}
          telefone={whatsAppTarget.telefone}
        />
      )}
    </>
  );
}
