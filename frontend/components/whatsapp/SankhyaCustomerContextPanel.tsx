'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { useWhatsAppTemplateStore } from '@/store/whatsappTemplateStore';
import { useAtendimentosHoje } from '@/hooks/useCobranca';
import { useWhatsAppStore } from '@/store/whatsappStore';
import { interpolarMensagemWhatsApp, TituloParaWhatsApp } from '@/lib/whatsappUtils';
import { formatCurrency, formatDate, formatPhone, formatCnpjCpf } from '@/lib/utils';
import { whatsappBridge } from '@/lib/whatsappBridge';
import { toast } from '@/hooks/useToast';
import { BoletoViewer } from '@/components/cobranca/BoletoViewer';
import { DanfeViewer } from '@/components/nfe/DanfeViewer';
import { RenegociacaoModal } from '@/components/cobranca/RenegociacaoModal';
import { WhatsAppTemplatesConfigModal } from '@/components/cobranca/WhatsAppTemplatesConfigModal';
import { WhatsAppSkillDiagnosticModal } from '@/components/whatsapp/WhatsAppSkillDiagnosticModal';
import {
  Building2,
  Phone,
  AlertTriangle,
  FileText,
  Send,
  Barcode,
  ScrollText,
  Loader2,
  CheckCircle2,
  Settings,
  Sparkles,
  QrCode,
  ListOrdered,
  Search,
  Handshake,
  MessageCircle,
  ExternalLink,
  CheckSquare,
  Square,
  Terminal,
} from 'lucide-react';

interface SankhyaCustomerContextPanelProps {
  activePhoneOrName: string | null;
  iframeRef?: HTMLIFrameElement | null;
}

interface ClienteSankhya {
  codParc: number;
  nomeParc: string;
  razaoSocial: string;
  cnpjCpf: string;
  telefone: string;
  email?: string | null;
  limiteCredito?: number;
  situacao?: string | null;
}

interface TituloSankhya {
  id: number;
  numero?: number | string | null;
  desdobramento?: string | null;
  dataVencimento: string | Date | null;
  valorEmAberto: number;
  status?: string;
  nossoNumero?: string | null;
  codigoBarras?: string | null;
  linhaDigitavel?: string | null;
  hasNfe?: boolean;
  diasAtraso?: number;
}

export function SankhyaCustomerContextPanel({
  activePhoneOrName,
  iframeRef,
}: SankhyaCustomerContextPanelProps) {
  const [loading, setLoading] = useState(false);
  const [cliente, setCliente] = useState<ClienteSankhya | null>(null);
  const [titulos, setTitulos] = useState<TituloSankhya[]>([]);
  const [totalEmAberto, setTotalEmAberto] = useState(0);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { templates, templateAtivoId } = useWhatsAppTemplateStore();
  const { activePartnerId, openWhatsAppWithContact } = useWhatsAppStore();
  const { data: atendimentosData, isLoading: loadingFila, refetch: refetchFila } = useAtendimentosHoje();

  const [filaBusca, setFilaBusca] = useState('');
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [diagnosticModalOpen, setDiagnosticModalOpen] = useState(false);
  const [mensagemEditada, setMensagemEditada] = useState('');
  const [sending, setSending] = useState(false);

  // Modais de Documentos e Renegociação
  const [boletoTituloId, setBoletoTituloId] = useState<number | null>(null);
  const [danfeNumNota, setDanfeNumNota] = useState<number | null>(null);
  const [renegociarPartner, setRenegociarPartner] = useState<{ id: number; nome: string } | null>(null);

  // Lista da Fila de Cobrança filtrada
  const filaAtendimento = useMemo(() => {
    const rawItems = atendimentosData?.items || [];
    if (!filaBusca.trim()) return rawItems;
    const term = filaBusca.toLowerCase();
    return rawItems.filter(
      (i) =>
        i.parceiroNome.toLowerCase().includes(term) ||
        (i.telefone && i.telefone.includes(term)) ||
        (i.cnpjCpf && i.cnpjCpf.includes(term)) ||
        String(i.parceiroId).includes(term)
    );
  }, [atendimentosData, filaBusca]);

  const handleSelectCustomer = (phone?: string | null, partnerId?: number, partnerName?: string) => {
    openWhatsAppWithContact(phone || '', partnerId, partnerName);
    if (phone) {
      whatsappBridge.openChat(phone, undefined, iframeRef);
    }
  };

  // Auto-selecionar o primeiro cliente da fila se nada estiver ativo no momento
  useEffect(() => {
    if (!activePhoneOrName && !activePartnerId && filaAtendimento && filaAtendimento.length > 0) {
      const primeiro = filaAtendimento[0];
      if (primeiro) {
        openWhatsAppWithContact(primeiro.telefone || '', primeiro.parceiroId, primeiro.parceiroNome);
      }
    }
  }, [activePhoneOrName, activePartnerId, filaAtendimento]);

  // Busca cliente e títulos por parceiroId ou telefone
  useEffect(() => {
    if (!activePhoneOrName && !activePartnerId) {
      setCliente(null);
      setTitulos([]);
      setTotalEmAberto(0);
      return;
    }

    const fetchClienteData = async () => {
      setLoading(true);
      try {
        const resp = await api.get('/api/whatsapp/titulos-por-telefone', {
          params: {
            telefone: activePhoneOrName || undefined,
            parceiroId: activePartnerId || undefined,
          },
        });

        if (resp.data && resp.data.cliente) {
          setCliente(resp.data.cliente);
          const listTitulos: TituloSankhya[] = resp.data.titulos || [];
          setTitulos(listTitulos);
          setTotalEmAberto(resp.data.totalEmAberto || 0);

          const ids = new Set<number>(listTitulos.map((t) => t.id));
          setSelectedIds(ids);
        } else {
          setCliente(null);
          setTitulos([]);
          setTotalEmAberto(0);
        }
      } catch (err) {
        console.error('Erro ao buscar dados do cliente no Sankhya:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClienteData();
  }, [activePhoneOrName, activePartnerId]);

  // Template Selecionado
  const templateAtual = useMemo(() => {
    return templates.find((t) => t.id === templateAtivoId) || templates[0];
  }, [templates, templateAtivoId]);

  // Títulos Formatados para Interpolação
  const titulosFormatados: TituloParaWhatsApp[] = useMemo(() => {
    return titulos
      .filter((t) => selectedIds.has(t.id))
      .map((t) => ({
        id: t.id,
        numero: t.numero || t.id,
        desdobramento: t.desdobramento,
        dataVencimento: t.dataVencimento,
        valorEmAberto: t.valorEmAberto,
        nossoNumero: t.nossoNumero,
      }));
  }, [titulos, selectedIds]);

  // Interpolação de Mensagem
  const mensagemCalculada = useMemo(() => {
    if (!templateAtual || !cliente) return '';
    return interpolarMensagemWhatsApp(templateAtual.mensagemTemplate, {
      nomeParceiro: cliente.nomeParc,
      titulos: titulosFormatados,
      telefone: cliente.telefone,
    });
  }, [templateAtual, cliente, titulosFormatados]);

  useEffect(() => {
    setMensagemEditada(mensagemCalculada);
  }, [mensagemCalculada]);

  const toggleSelectId = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === titulos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(titulos.map((t) => t.id)));
    }
  };

  const handleEnviarMensagem = async () => {
    if (!mensagemEditada.trim()) return;

    setSending(true);
    try {
      if (cliente) {
        whatsappBridge.sendTextToWhatsApp(mensagemEditada, iframeRef);

        await api.post('/api/whatsapp/registrar-historico', {
          parceiroId: cliente.codParc,
          mensagem: mensagemEditada,
        });

        await refetchFila();
        toast.success('Atendimento Concluído!', 'Mensagem enviada no WhatsApp e atendimento encerrado no Sankhya ERP.');
      }
    } catch (err: any) {
      console.error('Erro ao registrar histórico no Sankhya:', err);
      toast.error('Erro ao registrar', err?.response?.data?.message || 'Não foi possível encerrar o atendimento.');
    } finally {
      setSending(false);
    }
  };

  const handleEnviarPix = () => {
    const textoPix = `*DADOS PARA PAGAMENTO VIA PIX*\nChave PIX (CNPJ): 00.000.000/0001-00\nFavorecido: Sua Empresa LTDA\nValor: ${formatCurrency(
      totalEmAberto
    )}\nPor favor, envie o comprovante por aqui. Obrigado!`;
    whatsappBridge.sendTextToWhatsApp(textoPix, iframeRef);
    toast.success('PIX Enviado!', 'Dados do PIX inseridos no chat do WhatsApp.');
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200 overflow-y-auto">
      {/* Header do Painel Contextual */}
      <div className="p-3.5 border-b border-gray-100 bg-gradient-to-r from-emerald-50/70 to-teal-50/70 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-gray-900 leading-tight">
              Painel Financeiro Sankhya
            </h3>
            <p className="text-[10px] text-gray-500">
              {cliente ? `Cliente: ${cliente.nomeParc}` : activePhoneOrName ? `Contato: ${activePhoneOrName}` : 'Selecione um cliente'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDiagnosticModalOpen(true)}
            className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
            title="Abrir Console de Testes e Diagnóstico da Skill"
          >
            <Terminal className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setConfigModalOpen(true)}
            className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-white/80 rounded-lg transition-colors"
            title="Configurar Modelos de Mensagem"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* PARTE SUPERIOR: Detalhes do Cliente Ativo */}
      <div className="p-3.5 space-y-4 border-b border-gray-200 bg-white">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
            <span className="text-xs font-semibold">Consultando Sankhya...</span>
          </div>
        ) : !cliente && (activePhoneOrName || activePartnerId) ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Contato não identificado no Sankhya
            </div>
            <p className="text-[10px] leading-relaxed text-amber-800">
              Sem cadastro Sankhya localizado para o contato selecionado.
            </p>
          </div>
        ) : cliente ? (
          <>
            {/* Card do Cliente Identificado */}
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-2xs space-y-2">
              <div className="flex items-start justify-between">
                <div className="min-w-0 pr-2">
                  <h4 className="text-xs font-bold text-gray-900 leading-tight truncate">
                    {cliente.nomeParc}
                  </h4>
                  <p className="text-[10px] text-gray-500 font-mono">
                    Cód: {cliente.codParc} • {formatCnpjCpf(cliente.cnpjCpf)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Botão de Renegociação Rápida */}
                  <button
                    type="button"
                    onClick={() => setRenegociarPartner({ id: cliente.codParc, nome: cliente.nomeParc })}
                    className="inline-flex items-center gap-1 rounded-md bg-amber-500 hover:bg-amber-600 px-2 py-1 text-[10px] font-bold text-white shadow-2xs transition-colors"
                    title="Simular / Confirmar Renegociação"
                  >
                    <Handshake className="h-3 w-3" />
                    Renegociar
                  </button>

                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200">
                    {cliente.situacao === 'A' ? 'Ativo' : 'Sankhya OK'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] pt-1.5 border-t border-gray-100">
                <div>
                  <span className="text-gray-400 block">Telefone:</span>
                  <span className="font-semibold text-gray-800">{formatPhone(cliente.telefone)}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Limite de Crédito:</span>
                  <span className="font-semibold text-gray-800">
                    {cliente.limiteCredito ? formatCurrency(cliente.limiteCredito) : 'Ilimitado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Resumo e Lista de Títulos em Aberto */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-gray-400 hover:text-emerald-600 transition-colors"
                    title={selectedIds.size === titulos.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  >
                    {selectedIds.size === titulos.length && titulos.length > 0 ? (
                      <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Square className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
                    Títulos ({selectedIds.size}/{titulos.length})
                  </span>
                </div>
                <span className="text-xs font-black text-rose-700">
                  {formatCurrency(totalEmAberto)}
                </span>
              </div>

              {titulos.length === 0 ? (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-2.5 text-center text-xs text-emerald-800 font-medium">
                  <CheckCircle2 className="h-4 w-4 mx-auto text-emerald-600 mb-1" />
                  Nenhum título em aberto no momento!
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {titulos.map((t) => {
                    const isSelected = selectedIds.has(t.id);
                    const temBoleto = !!(t.nossoNumero || t.codigoBarras || t.linhaDigitavel);
                    const temNfe = !!(t.hasNfe || (t.numero && Number(t.numero) > 0));

                    return (
                      <div
                        key={t.id}
                        onClick={() => toggleSelectId(t.id)}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border p-2 text-xs transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/60 font-semibold shadow-2xs'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="min-w-0 pr-2 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectId(t.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                          />
                          <div>
                            <p className="font-bold text-gray-900 truncate text-[11px]">
                              {t.numero ? `Doc. ${t.numero}` : `NUFIN ${t.id}`}
                              {t.desdobramento && t.desdobramento !== '0' ? `/${t.desdobramento}` : ''}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              Venc: {formatDate(t.dataVencimento)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Botão Boleto PDF: Laranja se existir, Cinza se desabilitado */}
                          <button
                            type="button"
                            disabled={!temBoleto}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (temBoleto) setBoletoTituloId(t.id);
                            }}
                            className={`p-1 rounded text-white shadow-2xs transition-colors ${
                              temBoleto
                                ? 'bg-amber-500 hover:bg-amber-600 cursor-pointer'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                            title={temBoleto ? 'Visualizar Boleto PDF' : 'Sem boleto gerado no Sankhya'}
                          >
                            <Barcode className="h-3 w-3" />
                          </button>

                          {/* Botão DANFE NFe: Laranja se existir, Cinza se desabilitado */}
                          <button
                            type="button"
                            disabled={!temNfe}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (temNfe && t.numero) setDanfeNumNota(Number(t.numero));
                            }}
                            className={`p-1 rounded text-white shadow-2xs transition-colors ${
                              temNfe
                                ? 'bg-orange-500 hover:bg-orange-600 cursor-pointer'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                            title={temNfe ? 'Visualizar DANFE NF-e' : 'Sem Nota Fiscal/NFe emitida'}
                          >
                            <ScrollText className="h-3 w-3" />
                          </button>

                          <span className="font-extrabold text-emerald-950 text-[11px] ml-1">
                            {formatCurrency(t.valorEmAberto)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ações Rápidas */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleEnviarPix}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-[11px] font-bold text-teal-800 hover:bg-teal-100 transition-colors"
              >
                <QrCode className="h-3.5 w-3.5 text-teal-600" />
                Enviar PIX
              </button>

              <button
                type="button"
                onClick={() => setConfigModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[11px] font-bold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-gray-500" />
                Modelos ({templates.length})
              </button>
            </div>

            {/* Editor de Mensagem Interpolada */}
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <textarea
                rows={4}
                value={mensagemEditada}
                onChange={(e) => setMensagemEditada(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 text-xs font-sans text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                placeholder="A mensagem interpolada aparecerá aqui..."
              />

              <button
                type="button"
                onClick={handleEnviarMensagem}
                disabled={sending || !mensagemEditada.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Inserir & Enviar no WhatsApp
              </button>
            </div>
          </>
        ) : null}
      </div>

      {/* PARTE INFERIOR: Fila de Cobrança (Lista + Detalhe Interativo) */}
      <div className="flex-1 p-3.5 bg-gray-50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ListOrdered className="h-4 w-4 text-emerald-700" />
            <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
              Fila de Cobrança
            </h4>
          </div>
          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
            {filaAtendimento.length} clientes
          </span>
        </div>

        {/* Busca na Fila */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Filtrar por nome, CNPJ, tel ou código..."
            value={filaBusca}
            onChange={(e) => setFilaBusca(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-1 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none bg-white"
          />
        </div>

        {/* Lista de Atendimentos com Ações Completas */}
        {loadingFila ? (
          <div className="flex items-center justify-center py-6 text-xs text-gray-400 gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            Carregando fila de cobrança...
          </div>
        ) : filaAtendimento.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
            Nenhum cliente na fila no momento.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filaAtendimento.map((item) => {
              const isSelected = cliente && cliente.codParc === item.parceiroId;
              return (
                <div
                  key={item.parceiroId}
                  onClick={() => {
                    handleSelectCustomer(item.telefone, item.parceiroId, item.parceiroNome);
                  }}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all space-y-2 ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/80 shadow-xs font-semibold ring-1 ring-emerald-500'
                      : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 truncate text-[11px] leading-tight">
                        {item.parceiroNome}
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                        Cód: {item.parceiroId} • {item.telefone ? formatPhone(item.telefone) : 'Sem tel'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-emerald-950 text-[11px] block">
                        {item.valorVencido ? formatCurrency(item.valorVencido) : 'R$ 0,00'}
                      </span>
                      {item.diasAtrasoMax && item.diasAtrasoMax > 0 && (
                        <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 inline-block mt-0.5">
                          {item.diasAtrasoMax}d atraso
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações Diretas no Card da Fila */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100/80">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCustomer(item.telefone, item.parceiroId, item.parceiroNome);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded bg-emerald-600 hover:bg-emerald-700 py-1 text-[10px] font-bold text-white shadow-2xs transition-colors"
                      title="Abrir chat no WhatsApp e carregar cobrança"
                    >
                      <Send className="h-2.5 w-2.5" />
                      Cobrar
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenegociarPartner({ id: item.parceiroId, nome: item.parceiroNome });
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded bg-amber-500 hover:bg-amber-600 py-1 text-[10px] font-bold text-white shadow-2xs transition-colors"
                      title="Abrir modal de renegociação"
                    >
                      <Handshake className="h-2.5 w-2.5" />
                      Renegociar
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCustomer(item.telefone, item.parceiroId, item.parceiroNome);
                      }}
                      className="inline-flex items-center justify-center p-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-[10px] font-bold transition-colors"
                      title="Ver Títulos e Cadastro"
                    >
                      <FileText className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modais de Suporte (Renegociação, Modelos, Boletos e DANFE) */}
      {renegociarPartner && (
        <RenegociacaoModal
          parceiroId={renegociarPartner.id}
          parceiroNome={renegociarPartner.nome}
          open={!!renegociarPartner}
          onClose={() => setRenegociarPartner(null)}
          onSuccess={() => {
            setRenegociarPartner(null);
            refetchFila();
            toast.success('Renegociação efetuada!', 'Os títulos foram renegociados com sucesso.');
          }}
        />
      )}

      {configModalOpen && (
        <WhatsAppTemplatesConfigModal
          open={configModalOpen}
          onClose={() => setConfigModalOpen(false)}
        />
      )}

      <BoletoViewer tituloId={boletoTituloId} onClose={() => setBoletoTituloId(null)} />
      <DanfeViewer numnota={danfeNumNota} onClose={() => setDanfeNumNota(null)} />

      {/* Modal Console de Testes & Diagnóstico da Skill */}
      <WhatsAppSkillDiagnosticModal
        open={diagnosticModalOpen}
        onClose={() => setDiagnosticModalOpen(false)}
        iframeRef={iframeRef}
      />
    </div>
  );
}

