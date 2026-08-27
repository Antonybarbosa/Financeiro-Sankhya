'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTitulosPorCliente } from '@/hooks/useCobranca';
import { useWhatsAppTemplateStore } from '@/store/whatsappTemplateStore';
import {
  interpolarMensagemWhatsApp,
  gerarLinkWhatsAppWeb,
  TituloParaWhatsApp,
} from '@/lib/whatsappUtils';
import { formatCurrency, formatDate, formatPhone } from '@/lib/utils';
import { toast } from '@/hooks/useToast';
import { WhatsAppTemplatesConfigModal } from './WhatsAppTemplatesConfigModal';
import { BoletoViewer } from './BoletoViewer';
import { DanfeViewer } from '@/components/nfe/DanfeViewer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  MessageSquare,
  Send,
  Copy,
  CheckCircle2,
  Settings,
  Phone,
  FileText,
  Check,
  CheckSquare,
  Square,
  Loader2,
  Barcode,
  ScrollText,
} from 'lucide-react';

interface WhatsAppSendModalProps {
  open: boolean;
  onClose: () => void;
  parceiroId: number;
  parceiroNome: string;
  telefone?: string | null;
}

export function WhatsAppSendModal({
  open,
  onClose,
  parceiroId,
  parceiroNome,
  telefone,
}: WhatsAppSendModalProps) {
  const { templates, templateAtivoId, setTemplateAtivoId } = useWhatsAppTemplateStore();
  const [configOpen, setConfigOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [danfeNumNota, setDanfeNumNota] = useState<number | null>(null);
  const [boletoTituloId, setBoletoTituloId] = useState<number | null>(null);

  // Busca os títulos em aberto do parceiro
  const { data: titulosOriginais = [], isLoading: loadingTitulos } = useTitulosPorCliente(
    open ? parceiroId : null
  );

  // Títulos selecionados para o envio
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Inicializar seleção de todos os títulos em aberto quando carregar
  useEffect(() => {
    if (titulosOriginais.length > 0) {
      setSelectedIds(new Set(titulosOriginais.map((t) => t.id)));
    }
  }, [titulosOriginais]);

  // Template selecionado
  const templateAtual = useMemo(() => {
    return templates.find((t) => t.id === templateAtivoId) || templates[0];
  }, [templates, templateAtivoId]);

  // Formatar títulos para interpolação
  const titulosFormatados: TituloParaWhatsApp[] = useMemo(() => {
    return titulosOriginais
      .filter((t) => selectedIds.has(t.id))
      .map((t) => ({
        id: t.id,
        numero: t.numero || t.id,
        desdobramento: t.desdobramento,
        dataVencimento: t.dataVencimento,
        valorEmAberto: t.valorEmAberto,
        historico: t.historico,
        nossoNumero: t.nossoNumero,
      }));
  }, [titulosOriginais, selectedIds]);

  // Mensagem calculada
  const mensagemCalculada = useMemo(() => {
    if (!templateAtual) return '';
    return interpolarMensagemWhatsApp(templateAtual.mensagemTemplate, {
      nomeParceiro: parceiroNome,
      titulos: titulosFormatados,
      telefone,
    });
  }, [templateAtual, parceiroNome, titulosFormatados, telefone]);

  const [mensagemEditada, setMensagemEditada] = useState<string>('');

  // Atualizar mensagem editável quando o template ou seleção muda
  useEffect(() => {
    setMensagemEditada(mensagemCalculada);
  }, [mensagemCalculada]);

  const valorTotalSelecionado = useMemo(() => {
    return titulosFormatados.reduce((sum, t) => sum + t.valorEmAberto, 0);
  }, [titulosFormatados]);

  const toggleSelectAll = () => {
    if (selectedIds.size === titulosOriginais.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(titulosOriginais.map((t) => t.id)));
    }
  };

  const toggleSelectId = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleCopiar = () => {
    navigator.clipboard.writeText(mensagemEditada);
    setCopied(true);
    toast.success('Copiado!', 'Mensagem copiada para a área de transferência.');
    setTimeout(() => setCopied(false), 2000);
  };

  const linkWa = gerarLinkWhatsAppWeb(telefone, mensagemEditada);

  const handleDisparar = () => {
    if (!telefone) {
      toast.error('Sem telefone', 'Este parceiro não possui telefone/WhatsApp cadastrado.');
      return;
    }
    window.open(linkWa, '_blank');
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} className="max-w-5xl w-full max-h-[92vh]">
        <DialogContent className="p-6 overflow-y-auto">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-gray-900">
                    Enviar Mensagem via WhatsApp
                  </DialogTitle>
                  <p className="text-xs text-gray-500">
                    {parceiroNome} {telefone ? `• ${formatPhone(telefone)}` : '• (Sem telefone)'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConfigOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100"
              >
                <Settings className="h-3.5 w-3.5 text-gray-500" />
                Configurar Modelos
              </button>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 mt-3">
            {/* Coluna Esquerda: Seletor de Títulos e Parâmetros (5 Colunas) */}
            <div className="lg:col-span-5 space-y-3 border-r border-gray-100 pr-3">
              {/* Seletor de Modelo */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Modelo de Mensagem</Label>
                <Select
                  value={templateAtivoId}
                  onChange={(e) => setTemplateAtivoId(e.target.value)}
                  className="text-xs font-semibold text-gray-900"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.titulo}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Relação de Títulos do Cliente */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Títulos do Cliente ({titulosOriginais.length})
                  </Label>
                  {titulosOriginais.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-[11px] font-bold text-emerald-700 hover:underline"
                    >
                      {selectedIds.size === titulosOriginais.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  )}
                </div>

                {loadingTitulos ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-xs text-gray-500 bg-gray-50 rounded-xl">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    Carregando títulos...
                  </div>
                ) : titulosOriginais.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-500">
                    Nenhum título em aberto para este parceiro.
                  </div>
                ) : (
                  <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                    {titulosOriginais.map((t) => {
                      const isSelected = selectedIds.has(t.id);
                      return (
                        <div
                          key={t.id}
                          onClick={() => toggleSelectId(t.id)}
                          className={`flex cursor-pointer items-center justify-between rounded-lg border p-2 text-xs transition-all ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50/70 text-gray-900 font-semibold'
                              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 shrink-0 text-emerald-600" />
                            ) : (
                              <Square className="h-4 w-4 shrink-0 text-gray-300" />
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-bold text-gray-900">
                                {t.numero ? `Nº ${t.numero}` : `NUFIN ${t.id}`}
                                {t.desdobramento && t.desdobramento !== '0' ? `/${t.desdobramento}` : ''}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                Venc: {formatDate(t.dataVencimento)}
                              </p>
                            </div>
                          </div>

                          {(() => {
                            const temBoleto = Boolean(t.nossoNumero || t.codigoBarras || t.linhaDigitavel);
                            const temNota = Boolean(t.hasNfe || (t.numero && t.numero !== '0'));
                            return (
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={!temBoleto}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (temBoleto) setBoletoTituloId(t.id);
                                    }}
                                    title={
                                      temBoleto
                                        ? 'Visualizar / Imprimir / Salvar PDF do Boleto'
                                        : 'Sem código de barras/boleto registrado'
                                    }
                                    className={`rounded p-1 transition-colors shadow-2xs ${
                                      temBoleto
                                        ? 'bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 cursor-pointer'
                                        : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                                    }`}
                                  >
                                    <Barcode className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!temNota}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (temNota && t.numero) {
                                        setDanfeNumNota(
                                          typeof t.numero === 'number'
                                            ? t.numero
                                            : parseInt(String(t.numero))
                                        );
                                      }
                                    }}
                                    title={
                                      temNota
                                        ? 'Visualizar / Imprimir / Salvar PDF da DANFE (NF-e)'
                                        : 'Sem Nota Fiscal/Chave NFe registrada'
                                    }
                                    className={`rounded p-1 transition-colors shadow-2xs ${
                                      temNota
                                        ? 'bg-orange-500 hover:bg-orange-600 text-white border border-orange-600 cursor-pointer'
                                        : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                                    }`}
                                  >
                                    <ScrollText className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <span className="font-extrabold text-emerald-900">
                                  {formatCurrency(t.valorEmAberto)}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Resumo da Seleção */}
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5 text-xs flex items-center justify-between">
                  <span className="font-medium text-emerald-800">
                    {selectedIds.size} título(s) selecionado(s)
                  </span>
                  <span className="font-black text-emerald-950">
                    {formatCurrency(valorTotalSelecionado)}
                  </span>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Editor de Mensagem e Disparo (7 Colunas) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-700">
                    Mensagem a Enviar (Editável)
                  </Label>
                  <button
                    type="button"
                    onClick={handleCopiar}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 hover:text-gray-900"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-green-600" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-gray-500" />
                        Copiar Texto
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  rows={14}
                  value={mensagemEditada}
                  onChange={(e) => setMensagemEditada(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-3 text-xs font-sans text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                  placeholder="A mensagem interpolada aparecerá aqui..."
                />
              </div>

              {/* Aviso e Status do Telefone */}
              {!telefone && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 font-semibold flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-amber-600" />
                  Atenção: Este cliente não possui telefone cadastrado no Sankhya.
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-gray-100 pt-3 mt-2 flex flex-col sm:flex-row gap-2 justify-between">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleDisparar}
              disabled={!telefone || !mensagemEditada.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
              Disparar no WhatsApp
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Central de Modelos */}
      {configOpen && (
        <WhatsAppTemplatesConfigModal
          open={configOpen}
          onClose={() => setConfigOpen(false)}
        />
      )}

      {/* Visualizadores de Documentos (PDF do Boleto e DANFE) */}
      <BoletoViewer tituloId={boletoTituloId} onClose={() => setBoletoTituloId(null)} />
      <DanfeViewer numnota={danfeNumNota} onClose={() => setDanfeNumNota(null)} />
    </>
  );
}
