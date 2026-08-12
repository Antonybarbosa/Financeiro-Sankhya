'use client';

import { useState } from 'react';
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
} from 'lucide-react';

export interface ParceiroPanelData {
  parceiroId: number;
  parceiroNome: string;
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

  const atrasoInfo = diasAtrasoLabel(item.diasAtrasoMax ?? 0);
  const temFinanceiro = (item as FilaItem).qtdTitulos !== undefined;
  const titulosEmAberto = (titulos || []).filter((t) => t.isEmAberto);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-5 py-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-gray-900">
              {item.parceiroNome}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {item.cnpjCpf && (
                <span className="text-xs text-gray-500">
                  {formatCnpjCpf(item.cnpjCpf)}
                </span>
              )}
              {(item.diasAtrasoMax ?? 0) > 0 && (
                <Badge variant={item.diasAtrasoMax! > 0 ? 'danger' : 'success'}>
                  <Clock className="mr-1 h-3 w-3" />
                  {atrasoInfo.label}
                </Badge>
              )}
              {temFinanceiro && item.qtdTitulos !== undefined && (
                <Badge variant="info">
                  {item.qtdTitulos} título{item.qtdTitulos !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Quick action buttons */}
        <div className="mt-3 flex flex-wrap gap-2">
          {item.telefone && (
            <>
              <a
                href={formatWhatsAppLink(item.telefone)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
              <a
                href={formatTelLink(item.telefone)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Phone className="h-4 w-4" />
                {formatPhone(item.telefone)}
              </a>
            </>
          )}
          {item.email && (
            <a
              href={`mailto:${item.email}?subject=${encodeURIComponent('Cobrança - Título em aberto')}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Mail className="h-4 w-4" />
              E-mail
            </a>
          )}
          <button
            onClick={() => setRenegociarOpen(true)}
            disabled={titulosEmAberto.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Handshake className="h-4 w-4" />
            Renegociar
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Summary (only when financial data available) */}
        {temFinanceiro && (
        <div className="grid grid-cols-3 gap-px border-b border-gray-200 bg-gray-200">
          <div className="bg-white px-4 py-3">
            <p className="text-xs text-gray-500">Total em aberto</p>
            <p className="mt-0.5 text-sm font-bold text-gray-900">
              {formatCurrency(item.valorTotal ?? 0)}
            </p>
          </div>
          <div className="bg-white px-4 py-3">
            <p className="text-xs text-gray-500">Vencido</p>
            <p className="mt-0.5 text-sm font-bold text-red-600">
              {formatCurrency(item.valorVencido ?? 0)}
            </p>
          </div>
          <div className="bg-white px-4 py-3">
            <p className="text-xs text-gray-500">A vencer</p>
            <p className="mt-0.5 text-sm font-bold text-amber-600">
              {formatCurrency(item.valorAvencer ?? 0)}
            </p>
          </div>
        </div>
        )}

        {/* Titles list */}
        <div className="border-b border-gray-200 px-5 py-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <FileText className="h-4 w-4" />
            Títulos ({titulosEmAberto.length})
          </h3>
          {loadingTitulos ? (
            <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando títulos...
            </div>
          ) : titulosEmAberto.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              Nenhum título em aberto
            </p>
          ) : (
            <div className="space-y-2">
              {titulosEmAberto.map((titulo) => {
                const tituloAtraso = diasAtrasoLabel(titulo.diasVencido || titulo.diasParaVencimento * -1);
                return (
                   <div
                     key={titulo.id}
                     className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                   >
                     <div className="flex items-start justify-between">
                       <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {titulo.numero ? `#${titulo.numero}` : `NUFIN ${titulo.id}`}
                            </span>
                            {titulo.desdobramento && titulo.desdobramento !== '0' && (
                              <span className="text-xs text-gray-400">
                                Parc. {titulo.desdobramento}
                              </span>
                            )}
                            {titulo.nureneg && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-600">
                                <Handshake className="h-3 w-3" />
                                Reneg. {titulo.nureneg}
                              </span>
                            )}
                            {titulo.hasNfe && titulo.numero && (
                              <button
                                onClick={() => setDanfeNumNota(parseInt(titulo.numero))}
                                className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
                              >
                                <ScrollText className="h-3 w-3" />
                                DANFE
                              </button>
                            )}
                            {(titulo.linhaDigitavel || titulo.codigoBarras) && (
                              <button
                                onClick={() => setBoletoTituloId(titulo.id)}
                                className="inline-flex items-center gap-1 rounded bg-gray-800 px-1.5 py-0.5 text-xs font-medium text-white hover:bg-gray-900"
                              >
                                <Barcode className="h-3 w-3" />
                                Boleto
                              </button>
                            )}
                         </div>
                          <p className="mt-0.5 text-xs text-gray-500">
                            Venc: {formatDate(titulo.dataVencimento)}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-gray-400">
                            {titulo.historico || 'Sem histórico'}
                          </p>
                       </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(titulo.valorEmAberto)}
                        </p>
                        <span className={`text-xs font-medium ${tituloAtraso.color}`}>
                          {titulo.isVencido ? tituloAtraso.label : `${titulo.diasParaVencimento}d`}
                        </span>
                      </div>
                    </div>
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
    </div>
  );
}
