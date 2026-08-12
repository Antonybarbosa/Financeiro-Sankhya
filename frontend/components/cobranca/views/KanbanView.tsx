'use client';

import { useState, useMemo } from 'react';
import { useAtendimentosHoje, useConcluirContato, useMarcarPendenteContato } from '@/hooks/useCobranca';
import { AtendimentoHojeItem } from '@/types/cobranca';
import { ParceiroDetailPanel } from '../ParceiroDetailPanel';
import { ParceiroDadosExtras } from '../ParceiroDadosExtras';
import {
  formatWhatsAppLink,
  formatTelLink,
  formatPhone,
  formatDateTime,
  formatCurrency,
  diasAtrasoLabel,
} from '@/lib/utils';
import {
  Loader2,
  Phone,
  CheckCircle2,
  Clock,
  MessageCircle,
  RotateCcw,
  PhoneCall,
  Mail,
  ChevronDown,
} from 'lucide-react';
import { Dialog, DialogCloseButton } from '@/components/ui/dialog';

const PAGE_SIZE = 20;

export function KanbanView() {
  const { data, isLoading } = useAtendimentosHoje();
  const concluirContato = useConcluirContato();
  const marcarPendenteContato = useMarcarPendenteContato();
  const [selected, setSelected] = useState<AtendimentoHojeItem | null>(null);
  const [emAcao, setEmAcao] = useState<Set<number>>(new Set());
  const [limitPorColuna, setLimitPorColuna] = useState<Record<string, number>>({
    pendentes: PAGE_SIZE,
    resolvidos: PAGE_SIZE,
  });

  const colunas = useMemo(() => {
    const pendentes: AtendimentoHojeItem[] = [];
    const resolvidos: AtendimentoHojeItem[] = [];
    for (const it of data?.items ?? []) {
      if (it.pendente) pendentes.push(it);
      else resolvidos.push(it);
    }
    return { pendentes, resolvidos };
  }, [data]);

  const executarAcao = (item: AtendimentoHojeItem, acao: 'finalizar' | 'pendente') => {
    setEmAcao((p) => new Set(p).add(item.nurel));
    const mutation = acao === 'finalizar' ? concluirContato : marcarPendenteContato;
    mutation.mutate(item.nurel, {
      onSettled: () => {
        setEmAcao((prev) => {
          const next = new Set(prev);
          next.delete(item.nurel);
          return next;
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Carregando atendimentos do dia...
      </div>
    );
  }

  const total = data?.total ?? 0;
  if (total === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-400">
        <PhoneCall className="mx-auto h-10 w-10" />
        <p className="mt-2 text-sm">Nenhum atendimento agendado para hoje</p>
        <p className="mt-1 text-xs text-gray-300">
          Os atendimentos são criados no Sankhya e aparecerão aqui automaticamente.
        </p>
      </div>
    );
  }

  const columnConfig = [
    {
      key: 'pendentes' as const,
      title: 'Pendentes',
      icon: Clock,
      iconColor: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      items: colunas.pendentes,
    },
    {
      key: 'resolvidos' as const,
      title: 'Resolvidos',
      icon: CheckCircle2,
      iconColor: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      items: colunas.resolvidos,
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {columnConfig.map((col) => {
          const Icon = col.icon;
          return (
            <div
              key={col.key}
              className={`flex flex-col rounded-xl border ${col.border} bg-gray-50/50`}
            >
              <div className={`flex items-center justify-between rounded-t-xl ${col.bg} px-4 py-3`}>
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${col.iconColor}`} />
                  <span className="text-sm font-semibold text-gray-700">{col.title}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600">
                    {col.items.length}
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                {(() => {
                  const limit = limitPorColuna[col.key] ?? PAGE_SIZE;
                  const items = col.items.slice(0, limit);
                  const temMais = col.items.length > limit;
                  if (col.items.length === 0) {
                    return <p className="py-8 text-center text-xs text-gray-300">Vazio</p>;
                  }
                  return (
                    <>
                      {items.map((item) => {
                    const atraso = diasAtrasoLabel(item.diasAtrasoMax ?? 0);
                    return (
                      <div key={item.nurel} className="space-y-1.5">
                        <div
                          onClick={() => setSelected(item)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelected(item);
                            }
                          }}
                          className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {item.parceiroNome}
                              </p>
                              {item.ultimoContato?.comentarios && (
                                <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                                  {item.ultimoContato.comentarios}
                                </p>
                              )}
                              <p className="mt-0.5 text-[10px] text-gray-400">
                                Último: {formatDateTime(item.ultimoContato?.dataChamada)}
                              </p>
                            </div>
                            {item.totalContatos > 1 && (
                              <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                                {item.totalContatos}x
                              </span>
                            )}
                          </div>

                          {(item.valorVencido || item.diasAtrasoMax) && (
                            <div className="mt-2 flex items-end justify-between border-t border-gray-100 pt-1.5">
                              <div>
                                {item.valorVencido ? (
                                  <p className="text-sm font-bold text-gray-900">
                                    {formatCurrency(item.valorVencido)}
                                  </p>
                                ) : null}
                                {item.qtdVencidos ? (
                                  <p className="text-[10px] text-gray-400">
                                    {item.qtdVencidos} vencido{item.qtdVencidos !== 1 ? 's' : ''}
                                    {item.qtdTitulos ? ` · ${item.qtdTitulos} títulos` : ''}
                                  </p>
                                ) : item.qtdTitulos ? (
                                  <p className="text-[10px] text-gray-400">
                                    {item.qtdTitulos} título{item.qtdTitulos !== 1 ? 's' : ''}
                                  </p>
                                ) : null}
                              </div>
                              {item.diasAtrasoMax ? (
                                <span className={`text-[10px] font-medium ${atraso.color}`}>
                                  <Clock className="mr-0.5 inline h-2.5 w-2.5" />
                                  {atraso.label}
                                </span>
                              ) : null}
                            </div>
                          )}

                          {(item.telefone || item.email) && (
                            <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-500">
                              {item.telefone && (
                                <span className="inline-flex items-center gap-0.5">
                                  <Phone className="h-2.5 w-2.5" />
                                  {formatPhone(item.telefone)}
                                </span>
                              )}
                              {item.email && (
                                <span className="inline-flex items-center gap-0.5">
                                  <Mail className="h-2.5 w-2.5" />
                                  e-mail
                                </span>
                              )}
                            </div>
                          )}

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
                        </div>

                        <div className="flex gap-1.5">
                          {col.key === 'pendentes' ? (
                            <button
                              onClick={() => executarAcao(item, 'finalizar')}
                              disabled={emAcao.has(item.nurel)}
                              className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-green-600 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {emAcao.has(item.nurel) ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                              Finalizar
                            </button>
                          ) : (
                            <button
                              onClick={() => executarAcao(item, 'pendente')}
                              disabled={emAcao.has(item.nurel)}
                              className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-orange-200 bg-orange-50 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                            >
                              {emAcao.has(item.nurel) ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3 w-3" />
                              )}
                              Reabrir
                            </button>
                          )}

                          {item.telefone && (
                            <>
                              <a
                                href={formatWhatsAppLink(item.telefone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                                title="WhatsApp"
                              >
                                <MessageCircle className="h-3 w-3" />
                              </a>
                              <a
                                href={formatTelLink(item.telefone)}
                                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                                title={formatPhone(item.telefone)}
                              >
                                <Phone className="h-3 w-3" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                    }
                    {temMais && (
                      <button
                        onClick={() =>
                          setLimitPorColuna((prev) => ({
                            ...prev,
                            [col.key]: (prev[col.key] ?? PAGE_SIZE) + PAGE_SIZE,
                          }))
                        }
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                        Carregar mais ({col.items.length - limit} restantes)
                      </button>
                    )}
                    </>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!selected} onClose={() => setSelected(null)} className="max-w-3xl">
        <DialogCloseButton onClose={() => setSelected(null)} />
        {selected && (
          <ParceiroDetailPanel
            item={{
              parceiroId: selected.parceiroId,
              parceiroNome: selected.parceiroNome,
              telefone: selected.telefone,
              email: selected.email,
              cnpjCpf: selected.cnpjCpf,
            }}
            onClose={() => setSelected(null)}
          />
        )}
      </Dialog>
    </>
  );
}
