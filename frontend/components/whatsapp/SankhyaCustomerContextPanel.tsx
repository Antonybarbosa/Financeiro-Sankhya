'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { useWhatsAppTemplateStore } from '@/store/whatsappTemplateStore';
import { useAtendimentosHoje } from '@/hooks/useCobranca';
import { useWhatsAppStore } from '@/store/whatsappStore';
import { interpolarMensagemWhatsApp, TituloParaWhatsApp } from '@/lib/whatsappUtils';
import { formatCurrency, formatDate, formatPhone } from '@/lib/utils';
import { whatsappBridge } from '@/lib/whatsappBridge';
import { toast } from '@/hooks/useToast';
import { BoletoViewer } from '@/components/cobranca/BoletoViewer';
import { DanfeViewer } from '@/components/nfe/DanfeViewer';
import {
  UserCheck,
  Building2,
  Phone,
  CreditCard,
  AlertTriangle,
  FileText,
  Send,
  Copy,
  Barcode,
  ScrollText,
  Loader2,
  Calendar,
  CheckCircle2,
  Settings,
  Sparkles,
  QrCode,
  ListOrdered,
  Search,
  ChevronRight,
  Clock,
  PhoneCall,
  UserPlus,
  ArrowRight,
} from 'lucide-react';
import { WhatsAppTemplatesConfigModal } from '@/components/cobranca/WhatsAppTemplatesConfigModal';

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
  const { templates, templateAtivoId, setTemplateAtivoId } = useWhatsAppTemplateStore();
  const { openWhatsAppWithContact } = useWhatsAppStore();
  const { data: atendimentosData, isLoading: loadingFila } = useAtendimentosHoje();

  // Enviar para número específico
  const [mostrarEnvioNumero, setMostrarEnvioNumero] = useState(false);
  const [numeroEspecifico, setNumeroEspecifico] = useState('');
  const [buscandoNumero, setBuscandoNumero] = useState(false);

  const [filaBusca, setFilaBusca] = useState('');
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [mensagemEditada, setMensagemEditada] = useState('');
  const [sending, setSending] = useState(false);

  // Viewers
  const [boletoTituloId, setBoletoTituloId] = useState<number | null>(null);
  const [danfeNumNota, setDanfeNumNota] = useState<number | null>(null);

  // Lista da Fila de Cobrança filtrada
  const filaAtendimento = useMemo(() => {
    const rawItems = atendimentosData?.items || [];
    if (!filaBusca.trim()) return rawItems;
    const term = filaBusca.toLowerCase();
    return rawItems.filter(
      (i) =>
        i.parceiroNome.toLowerCase().includes(term) ||
        (i.telefone && i.telefone.includes(term)) ||
        (i.cnpjCpf && i.cnpjCpf.includes(term))
    );
  }, [atendimentosData, filaBusca]);

  // Auto-selecionar o primeiro cliente da fila se nada estiver ativo no momento
  useEffect(() => {
    if (!activePhoneOrName && filaAtendimento && filaAtendimento.length > 0) {
      const primeiro = filaAtendimento[0];
      if (primeiro && primeiro.telefone) {
        openWhatsAppWithContact(primeiro.telefone, primeiro.parceiroId, primeiro.parceiroNome);
      }
    }
  }, [activePhoneOrName, filaAtendimento, openWhatsAppWithContact]);

  // Busca cliente e títulos quando o telefone ativo do WhatsApp muda
  useEffect(() => {
    if (!activePhoneOrName) {
      setCliente(null);
      setTitulos([]);
      setTotalEmAberto(0);
      return;
    }

    const fetchClienteData = async () => {
      setLoading(true);
      try {
        const resp = await api.get('/api/whatsapp/titulos-por-telefone', {
          params: { telefone: activePhoneOrName },
        });

        if (resp.data && resp.data.cliente) {
          setCliente(resp.data.cliente);
          setTitulos(resp.data.titulos || []);
          setTotalEmAberto(resp.data.totalEmAberto || 0);

          const ids = new Set<number>((resp.data.titulos || []).map((t: TituloSankhya) => t.id));
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
  }, [activePhoneOrName]);

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
    if (!templateAtual || !cliente) return mensagemEditada || '';
    return interpolarMensagemWhatsApp(templateAtual.mensagemTemplate, {
      nomeParceiro: cliente.nomeParc,
      titulos: titulosFormatados,
      telefone: cliente.telefone,
    });
  }, [templateAtual, cliente, titulosFormatados]);

  useEffect(() => {
    if (mensagemCalculada) {
      setMensagemEditada(mensagemCalculada);
    }
  }, [mensagemCalculada]);

  const toggleSelectId = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleEnviarMensagem = async () => {
    if (!mensagemEditada.trim()) {
      toast.error('Mensagem vazia', 'Digite uma mensagem para enviar.');
      return;
    }

    setSending(true);
    try {
      whatsappBridge.sendTextToWhatsApp(mensagemEditada, iframeRef);

      if (cliente) {
        await api.post('/api/whatsapp/registrar-historico', {
          parceiroId: cliente.codParc,
          mensagem: mensagemEditada,
        });
      }

      toast.success('Mensagem enviada!', 'Texto injetado e enviado no WhatsApp Web.');
    } catch (err) {
      toast.error('Erro ao enviar', 'Não foi possível registrar o atendimento.');
    } finally {
      setSending(false);
    }
  };

  const handleEnviarPix = () => {
    const vlr = totalEmAberto > 0 ? formatCurrency(totalEmAberto) : 'a combinar';
    const textoPix = `*DADOS PARA PAGAMENTO VIA PIX*\nChave PIX (CNPJ): 00.000.000/0001-00\nFavorecido: Sua Empresa LTDA\nValor: ${vlr}\nPor favor, envie o comprovante por aqui. Obrigado!`;
    whatsappBridge.sendTextToWhatsApp(textoPix, iframeRef);
    toast.success('PIX Enviado!', 'Dados do PIX injetados e disparados no chat do WhatsApp.');
  };

  // Abrir conversa para um número específico
  const handleAbrirNumeroEspecifico = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = numeroEspecifico.replace(/\D/g, '');
    if (clean.length < 8) {
      toast.error('Número inválido', 'Digite o DDD e o número do WhatsApp.');
      return;
    }

    setBuscandoNumero(true);
    try {
      // 1. Notifica a ponte para carregar o número no WhatsApp Web
      whatsappBridge.navigateToPhone(clean, mensagemEditada, iframeRef);

      // 2. Atualiza o estado global
      openWhatsAppWithContact(clean);

      toast.success('Abrindo Conversa', `Carregando chat com ${numeroEspecifico} no WhatsApp...`);
      setMostrarEnvioNumero(false);
      setNumeroEspecifico('');
    } catch (err) {
      toast.error('Erro ao abrir', 'Não foi possível carregar o número.');
    } finally {
      setBuscandoNumero(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200 overflow-y-auto">
      {/* Header do Painel Contextual */}
      <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50/70 to-teal-50/70 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-gray-900 leading-tight">
              Painel Financeiro Sankhya
            </h3>
            <p className="text-[10px] text-gray-500">
              {cliente ? `Cliente: ${cliente.nomeParc}` : activePhoneOrName ? `Contato: ${activePhoneOrName}` : 'WhatsApp Web Conectado'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMostrarEnvioNumero(!mostrarEnvioNumero)}
            className={`p-1.5 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 ${
              mostrarEnvioNumero ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-white/80'
            }`}
            title="Enviar para número específico"
          >
            <UserPlus className="h-4 w-4" />
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

      {/* Caixa de Envio para Número Específico (Collapsible) */}
      {mostrarEnvioNumero && (
        <form onSubmit={handleAbrirNumeroEspecifico} className="p-3 bg-gray-900 text-white border-b border-gray-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider">
              Enviar para Número Específico
            </span>
            <button
              type="button"
              onClick={() => setMostrarEnvioNumero(false)}
              className="text-[10px] text-gray-400 hover:text-white"
            >
              Fechar
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="DDD + Número (ex: 11 99999-8888)..."
              value={numeroEspecifico}
              onChange={(e) => setNumeroEspecifico(e.target.value)}
              className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-xs text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={buscandoNumero || !numeroEspecifico.trim()}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shrink-0 flex items-center gap-1"
            >
              {buscandoNumero ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
              Abrir
            </button>
          </div>
        </form>
      )}

      {/* PARTE SUPERIOR: Detalhes do Cliente e Caixa de Envio */}
      <div className="p-3 space-y-3 border-b border-gray-200 bg-white">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-6 text-gray-400 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
            <span className="text-xs font-semibold">Consultando Sankhya...</span>
          </div>
        ) : cliente ? (
          <>
            {/* Card do Cliente Identificado */}
            <div className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-2xs space-y-1.5">
              <div className="flex items-start justify-between">
                <div className="min-w-0 pr-1">
                  <h4 className="text-xs font-bold text-gray-900 leading-tight truncate">
                    {cliente.nomeParc}
                  </h4>
                  <p className="text-[10px] text-gray-500 font-mono">
                    Cód: {cliente.codParc} • {cliente.cnpjCpf}
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700 border border-emerald-200 shrink-0">
                  {cliente.situacao === 'A' ? 'Ativo' : 'Sankhya'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1 border-t border-gray-100">
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

            {/* Resumo de Títulos em Aberto */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                  Títulos ({titulos.length})
                </span>
                <span className="text-xs font-black text-rose-700">
                  {formatCurrency(totalEmAberto)}
                </span>
              </div>

              {titulos.length === 0 ? (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-2 text-center text-xs text-emerald-800 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 mx-auto text-emerald-600 mb-0.5" />
                  Nenhum título em aberto!
                </div>
              ) : (
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                  {titulos.map((t) => {
                    const isSelected = selectedIds.has(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => toggleSelectId(t.id)}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border p-1.5 text-xs transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/60 font-semibold'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-gray-900 truncate text-[10px]">
                            {t.numero ? `Doc. ${t.numero}` : `NUFIN ${t.id}`}
                            {t.desdobramento && t.desdobramento !== '0' ? `/${t.desdobramento}` : ''}
                          </p>
                          <p className="text-[9px] text-gray-500">
                            Venc: {formatDate(t.dataVencimento)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {t.nossoNumero && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBoletoTituloId(t.id);
                              }}
                              className="p-1 rounded bg-amber-500 hover:bg-amber-600 text-white shadow-2xs"
                              title="Visualizar Boleto"
                            >
                              <Barcode className="h-3 w-3" />
                            </button>
                          )}
                          <span className="font-extrabold text-emerald-950 text-[10px]">
                            {formatCurrency(t.valorEmAberto)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-2 text-center text-xs text-gray-500">
            <p className="font-semibold text-gray-700">Chat do WhatsApp Web Ativo</p>
            <p className="text-[10px] text-gray-400">
              Digite uma mensagem abaixo ou selecione um cliente da fila para carregar os títulos.
            </p>
          </div>
        )}

        {/* Ações Rápidas (SEMPRE VISÍVEIS) */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleEnviarPix}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-1.5 text-[11px] font-bold text-teal-800 hover:bg-teal-100 transition-colors shadow-2xs"
          >
            <QrCode className="h-3.5 w-3.5 text-teal-600" />
            Enviar PIX
          </button>

          <button
            type="button"
            onClick={() => setConfigModalOpen(true)}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-[11px] font-bold text-gray-700 hover:bg-gray-100 transition-colors shadow-2xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-gray-500" />
            Modelos ({templates.length})
          </button>
        </div>

        {/* Editor e Botão de Envio no WhatsApp (SEMPRE VISÍVEIS) */}
        <div className="space-y-1.5 pt-1">
          <textarea
            rows={4}
            value={mensagemEditada}
            onChange={(e) => setMensagemEditada(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2 text-xs font-sans text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed"
            placeholder="Digite a mensagem para enviar no WhatsApp..."
          />

          <button
            type="button"
            onClick={handleEnviarMensagem}
            disabled={sending || !mensagemEditada.trim()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Inserir & Enviar no WhatsApp
          </button>
        </div>
      </div>

      {/* PARTE INFERIOR: Fila de Cobrança (Lista + Detalhe) */}
      <div className="flex-1 p-3 bg-gray-50 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ListOrdered className="h-4 w-4 text-emerald-700" />
            <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
              Fila de Cobrança (Atendimentos)
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
            placeholder="Filtrar fila..."
            value={filaBusca}
            onChange={(e) => setFilaBusca(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-1 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none bg-white"
          />
        </div>

        {/* Lista de Atendimentos */}
        {loadingFila ? (
          <div className="flex items-center justify-center py-6 text-xs text-gray-400 gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            Carregando fila...
          </div>
        ) : filaAtendimento.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 p-3 text-center text-xs text-gray-400">
            Nenhum cliente na fila no momento.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {filaAtendimento.map((item) => {
              const isSelected = cliente && cliente.codParc === item.parceiroId;
              return (
                <div
                  key={item.parceiroId}
                  onClick={() => {
                    if (item.telefone) {
                      openWhatsAppWithContact(item.telefone, item.parceiroId, item.parceiroNome);
                    }
                  }}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50 shadow-2xs font-semibold'
                      : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-gray-900 truncate text-[11px]">
                        {item.parceiroNome}
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono">
                        Cód: {item.parceiroId} • {item.telefone ? formatPhone(item.telefone) : 'Sem tel'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-emerald-950 text-[11px] block">
                        {item.valorVencido ? formatCurrency(item.valorVencido) : 'R$ 0,00'}
                      </span>
                      {item.diasAtrasoMax && item.diasAtrasoMax > 0 && (
                        <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          {item.diasAtrasoMax}d atraso
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modais de Documentos e Configurações */}
      {configModalOpen && (
        <WhatsAppTemplatesConfigModal
          open={configModalOpen}
          onClose={() => setConfigModalOpen(false)}
        />
      )}

      <BoletoViewer tituloId={boletoTituloId} onClose={() => setBoletoTituloId(null)} />
      <DanfeViewer numnota={danfeNumNota} onClose={() => setDanfeNumNota(null)} />
    </div>
  );
}
