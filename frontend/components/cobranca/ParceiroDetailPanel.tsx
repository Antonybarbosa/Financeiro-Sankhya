'use client';

import { useState, useMemo } from 'react';
import { useTitulosPorCliente } from '@/hooks/useCobranca';
import { FilaItem } from '@/types/cobranca';
import {
  formatCurrency,
  formatDate,
  formatPhone,
  formatCnpjCpf,
  formatWhatsAppLink,
  formatTelLink,
  diasAtrasoLabel,
} from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { DanfeViewer } from '@/components/nfe/DanfeViewer';
import { RenegociacaoModal } from './RenegociacaoModal';
import { BoletoViewer } from './BoletoViewer';
import {
  Phone,
  MessageCircle,
  Mail,
  Clock,
  FileText,
  Loader2,
  X,
  ScrollText,
  Handshake,
  Barcode,
  AlertTriangle,
  Calendar,
  DollarSign,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

import { WhatsAppSendModal } from './WhatsAppSendModal';

export interface ParceiroPanelData {
  parceiroId: number;
  parceiroNome: string;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  telefone?: string | null;
  email?: string | null;
  cnpjCpf?: string | null;
  diasAtrasoMax?: number;
  qtdTitulos?: number;
  valorTotal?: number;
  valorVencido?: number;
  valorAvencer?: number;
}

interface ParceiroDetailPanelProps {
  item: ParceiroPanelData | FilaItem;
  onClose?: () => void;
}

export function ParceiroDetailPanel({ item, onClose }: ParceiroDetailPanelProps) {
  const { data: titulos, isLoading: loadingTitulos } = useTitulosPorCliente(item.parceiroId);
  const [danfeNumNota, setDanfeNumNota] = useState<number | null>(null);
  const [boletoTituloId, setBoletoTituloId] = useState<number | null>(null);
  const [renegociarOpen, setRenegociarOpen] = useState(false);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [expandedTituloIds, setExpandedTituloIds] = useState<Set<number>>(new Set());

  const toggleExpandTitulo = (id: number) => {
    setExpandedTituloIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const titulosEmAberto = (titulos || []).filter((t) => t.isEmAberto);

  const kpis = useMemo(() => {
    let totalAberto = 0;
    let totalVencido = 0;
    let total7Dias = 0;
    let totalEmDia = 0;
    let countVencidos = 0;
    let count7Dias = 0;
    let countEmDia = 0;

    titulosEmAberto.forEach((t) => {
      const v = t.valorEmAberto || 0;
      totalAberto += v;
      if (t.isVencido) {
        totalVencido += v;
        countVencidos++;
      } else if (t.diasParaVencimento <= 7) {
        total7Dias += v;
        count7Dias++;
      } else {
        totalEmDia += v;
        countEmDia++;
      }
    });

    return { totalAberto, totalVencido, total7Dias, totalEmDia, countVencidos, count7Dias, countEmDia };
  }, [titulosEmAberto]);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {item.razaoSocial || item.parceiroNome}
          </h2>
          {(item.nomeFantasia || (item.razaoSocial && item.razaoSocial !== item.parceiroNome)) && (
            <p className="text-xs font-semibold text-gray-500">
              Nome Fantasia: {item.nomeFantasia || item.parceiroNome}
            </p>
          )}
          <p className="text-xs font-semibold text-gray-600">
            Cód: <span className="font-mono text-gray-900">{item.parceiroId}</span>
            {item.cnpjCpf && ` · ${formatCnpjCpf(item.cnpjCpf)}`}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Contato rápido */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Canais de Contato</h4>
          <div className="flex flex-wrap items-center gap-2">
            {item.telefone ? (
              <>
                <button
                  type="button"
                  onClick={() => setWhatsAppOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp ({formatPhone(item.telefone)})
                </button>
              </>
            ) : (
              <span className="text-xs text-gray-400 font-semibold">Sem telefone cadastrado</span>
            )}
            {item.email && (
              <a
                href={`mailto:${item.email}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors shadow-xs"
              >
                <Mail className="h-3.5 w-3.5 text-indigo-600" />
                E-mail
              </a>
            )}
          </div>
        </div>

        {/* 4 KPIs de Resumo dos Títulos */}
        {!loadingTitulos && titulosEmAberto.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 shadow-xs">
              <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-indigo-600" />
                Total Aberto
              </span>
              <p className="mt-1 text-xs sm:text-sm font-extrabold text-indigo-950">
                {formatCurrency(kpis.totalAberto)}
              </p>
              <span className="text-[10px] font-semibold text-indigo-700">
                {titulosEmAberto.length} título(s)
              </span>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 shadow-xs">
              <span className="text-[11px] font-bold text-red-900 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                Total Vencido
              </span>
              <p className="mt-1 text-xs sm:text-sm font-extrabold text-red-950">
                {formatCurrency(kpis.totalVencido)}
              </p>
              <span className="text-[10px] font-semibold text-red-700">
                {kpis.countVencidos} em atraso
              </span>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 shadow-xs">
              <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                Venc. 7 Dias
              </span>
              <p className="mt-1 text-xs sm:text-sm font-extrabold text-amber-950">
                {formatCurrency(kpis.total7Dias)}
              </p>
              <span className="text-[10px] font-semibold text-amber-700">
                {kpis.count7Dias} a vencer
              </span>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Títulos em Dia
              </span>
              <p className="mt-1 text-xs sm:text-sm font-extrabold text-emerald-950">
                {formatCurrency(kpis.totalEmDia)}
              </p>
              <span className="text-[10px] font-semibold text-emerald-700">
                {kpis.countEmDia} regular(es)
              </span>
            </div>
          </div>
        )}

        {/* Lista de Títulos em Aberto com Cards Expansíveis */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-600" />
              Títulos em Aberto ({titulosEmAberto.length})
            </h3>
            {titulosEmAberto.length > 0 && (
              <button
                type="button"
                onClick={() => setRenegociarOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-700 transition-all shadow-xs cursor-pointer"
              >
                <Handshake className="h-3.5 w-3.5" />
                Renegociar Títulos
              </button>
            )}
          </div>

          {loadingTitulos ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs font-semibold text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              Carregando títulos do parceiro...
            </div>
          ) : titulosEmAberto.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-1" />
              <p className="text-xs font-bold text-gray-800">Nenhum título em aberto</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Este parceiro está 100% em dia com os pagamentos.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {titulosEmAberto.map((titulo) => {
                const tituloAtraso = diasAtrasoLabel(titulo.diasVencido || titulo.diasParaVencimento * -1);
                const isLate = titulo.isVencido;
                const isDueSoon = !isLate && titulo.diasParaVencimento <= 3;
                const isExpanded = expandedTituloIds.has(titulo.id);

                return (
                  <div
                    key={titulo.id}
                    className={`rounded-xl border transition-all shadow-xs overflow-hidden ${
                      isLate
                        ? 'border-red-200 bg-red-50/30'
                        : isDueSoon
                        ? 'border-amber-200 bg-amber-50/30'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    {/* Linha Principal do Card (Clique para Expandir/Recolher) */}
                    <div
                      onClick={() => toggleExpandTitulo(titulo.id)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 cursor-pointer hover:bg-gray-50/60 transition-colors gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-indigo-600 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                        )}

                        <span className="text-xs font-extrabold text-gray-900 font-mono shrink-0">
                          {titulo.numero ? `#${titulo.numero}` : `NUFIN ${titulo.id}`}
                        </span>
                        {titulo.desdobramento && titulo.desdobramento !== '0' && (
                          <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-700 shrink-0">
                            P.{titulo.desdobramento}
                          </span>
                        )}
                        {titulo.nureneg && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800 shrink-0">
                            <Handshake className="h-3 w-3" />
                            #{titulo.nureneg}
                          </span>
                        )}
                        <span className="text-xs font-bold text-gray-700 shrink-0 hidden md:inline">
                          Venc: {formatDate(titulo.dataVencimento)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold border shrink-0 ${
                            isLate
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : isDueSoon
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {isLate ? `🚨 ${tituloAtraso.label}` : `⏳ ${titulo.diasParaVencimento}d`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span className="text-xs font-extrabold text-gray-900">
                          {formatCurrency(titulo.valorEmAberto)}
                        </span>
                        <span className="text-[11px] font-bold text-indigo-600 flex items-center gap-0.5">
                          {isExpanded ? 'Recolher' : 'Expandir'}
                        </span>
                      </div>
                    </div>

                    {/* Detalhes Expandidos do Card */}
                    {isExpanded && (
                      <div className="border-t border-gray-200/80 bg-white/90 p-4 space-y-3 animate-in fade-in duration-150">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-gray-500 font-semibold">Data de Vencimento:</span>{' '}
                            <span className="font-bold text-gray-900">{formatDate(titulo.dataVencimento)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 font-semibold">Valor em Aberto:</span>{' '}
                            <span className="font-extrabold text-gray-900">{formatCurrency(titulo.valorEmAberto)}</span>
                            {titulo.valor && titulo.valor > titulo.valorEmAberto && (
                              <span className="ml-1 text-[10px] text-gray-400 font-normal">
                                (Original: {formatCurrency(titulo.valor)})
                              </span>
                            )}
                          </div>
                        </div>

                        {titulo.historico && (
                          <div className="rounded-lg bg-gray-50 p-2.5 border border-gray-200 text-xs">
                            <span className="font-bold text-gray-700">Histórico / Observações:</span>{' '}
                            <span className="text-gray-800">{titulo.historico}</span>
                          </div>
                        )}

                        {/* Botões de Ação Destacados */}
                        {(() => {
                          const temBoleto = Boolean(titulo.nossoNumero || titulo.codigoBarras || titulo.linhaDigitavel);
                          const temNota = Boolean(titulo.hasNfe || (titulo.numero && titulo.numero !== '0'));
                          return (
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                              <button
                                type="button"
                                disabled={!temBoleto}
                                onClick={() => temBoleto && setBoletoTituloId(titulo.id)}
                                title={temBoleto ? 'Visualizar / Imprimir / Salvar PDF do Boleto' : 'Sem código de barras/boleto registrado'}
                                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors shadow-xs ${
                                  temBoleto
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 cursor-pointer'
                                    : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                                }`}
                              >
                                <Barcode className="h-3.5 w-3.5" />
                                Ver Boleto
                              </button>

                              <button
                                type="button"
                                disabled={!temNota}
                                onClick={() => temNota && titulo.numero && setDanfeNumNota(parseInt(titulo.numero))}
                                title={temNota ? 'Visualizar / Imprimir / Salvar PDF da DANFE (NF-e)' : 'Sem Nota Fiscal/Chave NFe registrada'}
                                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors shadow-xs ${
                                  temNota
                                    ? 'bg-orange-500 hover:bg-orange-600 text-white border border-orange-600 cursor-pointer'
                                    : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                                }`}
                              >
                                <ScrollText className="h-3.5 w-3.5" />
                                DANFE (NFe)
                              </button>

                              {item.telefone && (
                                <button
                                  type="button"
                                  onClick={() => setWhatsAppOpen(true)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs cursor-pointer"
                                >
                                  <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                                  Cobrar WhatsApp
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <DanfeViewer numnota={danfeNumNota} onClose={() => setDanfeNumNota(null)} />

      <BoletoViewer tituloId={boletoTituloId} onClose={() => setBoletoTituloId(null)} />

      <RenegociacaoModal
        parceiroId={item.parceiroId}
        parceiroNome={item.parceiroNome}
        open={renegociarOpen}
        onClose={() => setRenegociarOpen(false)}
      />

      <WhatsAppSendModal
        open={whatsAppOpen}
        onClose={() => setWhatsAppOpen(false)}
        parceiroId={item.parceiroId}
        parceiroNome={item.parceiroNome}
        telefone={item.telefone}
      />
    </div>
  );
}
