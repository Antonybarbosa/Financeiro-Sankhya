'use client';

import { useState, useMemo } from 'react';
import { useAtendimentosHoje, useConcluirContato, useMarcarPendenteContato } from '@/hooks/useCobranca';
import { AtendimentoHojeItem } from '@/types/cobranca';
import { ParceiroDetailPanel } from '../ParceiroDetailPanel';
import { ParceiroDadosExtras } from '../ParceiroDadosExtras';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/useToast';
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
  Building2,
  Calendar,
} from 'lucide-react';
import { Dialog, DialogCloseButton } from '@/components/ui/dialog';

const PAGE_SIZE = 20;

function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 animate-in fade-in duration-300">
      {[1, 2].map((col) => (
        <div key={col} className="flex flex-col rounded-xl border border-gray-200 bg-gray-50/50 p-3 space-y-3">
          <div className="flex items-center justify-between px-2 py-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          {[1, 2, 3].map((card) => (
            <div key={card} className="rounded-lg border border-gray-200 bg-white p-3.5 space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-4 w-8 rounded" />
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-8 flex-1 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

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
      onSuccess: () => {
        if (acao === 'finalizar') {
          toast.success('Atendimento concluído', `${item.parceiroNome} foi marcado como resolvido.`);
        } else {
          toast.info('Atendimento reaberto', `${item.parceiroNome} retornou para a lista de pendentes.`);
        }
      },
      onError: (err: any) => {
        toast.error('Erro na ação', err?.response?.data?.message || 'Falha ao atualizar o atendimento.');
      },
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
    return <KanbanSkeleton />;
  }

  const total = data?.total ?? 0;
  if (total === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-400">
        <PhoneCall className="mx-auto h-10 w-10 text-gray-300" />
        <p className="mt-2 text-sm font-medium text-gray-700">Nenhum atendimento agendado para hoje</p>
        <p className="mt-1 text-xs text-gray-400">
          Os atendimentos são vinculados ao operador no Sankhya e aparecerão automaticamente aqui.
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
      bg: 'bg-orange-50/80',
      border: 'border-orange-200',
      items: colunas.pendentes,
    },
    {
      key: 'resolvidos' as const,
      title: 'Resolvidos',
      icon: CheckCircle2,
      iconColor: 'text-green-600',
      bg: 'bg-green-50/80',
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
              className={`flex flex-col rounded-xl border ${col.border} bg-gray-50/60 transition-all`}
            >
              <div className={`flex items-center justify-between rounded-t-xl ${col.bg} px-4 py-3 border-b border-gray-200/60`}>
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${col.iconColor}`} />
                  <span className="text-sm font-semibold text-gray-800">{col.title}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-gray-700 shadow-xs border border-gray-100">
                    {col.items.length}
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                {(() => {
                  const limit = limitPorColuna[col.key] ?? PAGE_SIZE;
                  const items = col.items.slice(0, limit);
                  const temMais = col.items.length > limit;
                  if (col.items.length === 0) {
                    return (
                      <div className="py-12 text-center text-xs text-gray-400">
                        Nenhum atendimento nesta coluna
                      </div>
                    );
                  }
                  return (
                    <>
                      {items.map((item) => {
                        const atraso = diasAtrasoLabel(item.diasAtrasoMax ?? 0);
                        return (
                          <div key={item.nurel} className="space-y-1.5 group">
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
                              className="w-full rounded-xl border border-gray-200/90 bg-white p-3.5 text-left shadow-xs transition-all duration-200 hover:border-blue-300 hover:shadow-md cursor-pointer"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                    {item.parceiroNome}
                                  </p>
                                  {item.ultimoContato?.comentarios && (
                                    <p className="mt-1 line-clamp-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-md border border-gray-100 italic">
                                      "{item.ultimoContato.comentarios}"
                                    </p>
                                  )}
                                  <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                                    <Calendar className="h-2.5 w-2.5" />
                                    Último: {formatDateTime(item.ultimoContato?.dataChamada)}
                                  </p>
                                </div>
                                {item.totalContatos > 1 && (
                                  <span className="shrink-0 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-100">
                                    {item.totalContatos}x atendeu
                                  </span>
                                )}
                              </div>

                              {(item.valorVencido || item.diasAtrasoMax) && (
                                <div className="mt-3 flex items-end justify-between border-t border-gray-100 pt-2">
                                  <div>
                                    {item.valorVencido ? (
                                      <p className="text-sm font-extrabold text-gray-900">
                                        {formatCurrency(item.valorVencido)}
                                      </p>
                                    ) : null}
                                    {item.qtdVencidos ? (
                                      <p className="text-[10px] text-gray-500 font-medium">
                                        {item.qtdVencidos} vencido{item.qtdVencidos !== 1 ? 's' : ''}
                                        {item.qtdTitulos ? ` · ${item.qtdTitulos} títulos` : ''}
                                      </p>
                                    ) : item.qtdTitulos ? (
                                      <p className="text-[10px] text-gray-500 font-medium">
                                        {item.qtdTitulos} título{item.qtdTitulos !== 1 ? 's' : ''}
                                      </p>
                                    ) : null}
                                  </div>
                                  {item.diasAtrasoMax ? (
                                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200/80 ${atraso.color}`}>
                                      <Clock className="h-2.5 w-2.5" />
                                      {atraso.label}
                                    </span>
                                  ) : null}
                                </div>
                              )}

                              {(item.telefone || item.email) && (
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-600 font-medium pt-1">
                                  {item.telefone && (
                                    <span className="inline-flex items-center gap-1 text-gray-700">
                                      <Phone className="h-3 w-3 text-blue-600" />
                                      {formatPhone(item.telefone)}
                                    </span>
                                  )}
                                  {item.email && (
                                    <span className="inline-flex items-center gap-1 text-gray-600 truncate max-w-[180px]">
                                      <Mail className="h-3 w-3 text-gray-400" />
                                      {item.email}
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

                            <div className="flex gap-1.5 pt-0.5">
                              {col.key === 'pendentes' ? (
                                <button
                                  onClick={() => executarAcao(item, 'finalizar')}
                                  disabled={emAcao.has(item.nurel)}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
                                >
                                  {emAcao.has(item.nurel) ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  )}
                                  Finalizar
                                </button>
                              ) : (
                                <button
                                  onClick={() => executarAcao(item, 'pendente')}
                                  disabled={emAcao.has(item.nurel)}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 py-1.5 text-xs font-semibold text-orange-700 shadow-xs transition-colors hover:bg-orange-100 active:bg-orange-200 disabled:opacity-50"
                                >
                                  {emAcao.has(item.nurel) ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <RotateCcw className="h-3.5 w-3.5" />
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
                                    className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-emerald-700"
                                    title="WhatsApp"
                                  >
                                    <MessageCircle className="h-3.5 w-3.5" />
                                  </a>
                                  <a
                                    href={formatTelLink(item.telefone)}
                                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-blue-700"
                                    title={formatPhone(item.telefone)}
                                  >
                                    <Phone className="h-3.5 w-3.5" />
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {temMais && (
                        <button
                          onClick={() =>
                            setLimitPorColuna((prev) => ({
                              ...prev,
                              [col.key]: (prev[col.key] ?? PAGE_SIZE) + PAGE_SIZE,
                            }))
                          }
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
                        >
                          <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
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
