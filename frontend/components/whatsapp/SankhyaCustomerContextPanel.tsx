'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  ArrowLeft,
  User,
  Clock,
  ChevronRight,
  X,
  Users,
  CheckCircle,
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
  // Controle de Abas: 'fila' (Principal) vs 'atendimento' (Detalhes Unificados)
  const [activeTab, setActiveTab] = useState<'fila' | 'atendimento'>('fila');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'atraso' | 'criticos'>('todos');

  const [loading, setLoading] = useState(false);
  const [cliente, setCliente] = useState<ClienteSankhya | null>(null);
  const [clientesEncontrados, setClientesEncontrados] = useState<ClienteSankhya[]>([]);
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
  const [debugBusca, setDebugBusca] = useState<any>(null);

  // Lista da Fila de Cobrança bruta
  const rawFilaItems = useMemo(() => atendimentosData?.items || [], [atendimentosData]);

  // Contagens para os Filtros Rápidos
  const countTodos = rawFilaItems.length;
  const countAtraso = useMemo(() => rawFilaItems.filter((i) => i.diasAtrasoMax && i.diasAtrasoMax > 0).length, [rawFilaItems]);
  const countCriticos = useMemo(() => rawFilaItems.filter((i) => i.diasAtrasoMax && i.diasAtrasoMax >= 30).length, [rawFilaItems]);

  // Lista da Fila de Cobrança filtrada por status e termo de busca
  const filaAtendimento = useMemo(() => {
    let items = rawFilaItems;

    // Filtro rápido de status
    if (statusFilter === 'atraso') {
      items = items.filter((i) => i.diasAtrasoMax && i.diasAtrasoMax > 0);
    } else if (statusFilter === 'criticos') {
      items = items.filter((i) => i.diasAtrasoMax && i.diasAtrasoMax >= 30);
    }

    // Helper de normalização que remove +55 ou 55 inicial e pontuação
    const cleanPhoneDigits = (raw: string) => {
      let d = raw.replace(/\D/g, '');
      if (d.startsWith('55') && (d.length === 12 || d.length === 13)) {
        d = d.slice(2);
      }
      return d;
    };

    // Filtro por texto robusto e normalizado (compatível com dígitos limpos, sem +55 e texto formatado)
    if (!filaBusca.trim()) return items;
    const term = filaBusca.toLowerCase().trim();
    const termDigits = cleanPhoneDigits(term);

    return items.filter((i) => {
      const nome = (i.parceiroNome || '').toLowerCase();
      const nomeMatch = nome.includes(term);
      const codMatch = String(i.parceiroId).includes(term);

      const telRaw = (i.telefone || '').toLowerCase();
      const telDigits = cleanPhoneDigits(telRaw);
      const telMatch =
        telRaw.includes(term) ||
        (termDigits.length >= 3 && (telDigits.includes(termDigits) || termDigits.includes(telDigits)));

      const cnpjRaw = (i.cnpjCpf || '').toLowerCase();
      const cnpjDigits = cnpjRaw.replace(/\D/g, '');
      const cnpjMatch =
        cnpjRaw.includes(term) ||
        (termDigits.length >= 3 && cnpjDigits.includes(termDigits));

      return nomeMatch || codMatch || telMatch || cnpjMatch;
    });
  }, [rawFilaItems, statusFilter, filaBusca]);

  // Referência do último contato que provocou troca de aba para evitar re-gatilho automático
  const lastSwitchedContactRef = useRef<string | null>(null);
  const isInitialMountRef = useRef<boolean>(true);

  // Ação ao selecionar um cliente da fila (abre conversa no WhatsApp Web e carrega títulos)
  const handleSelectCustomer = (
    phone?: string | null,
    partnerId?: number,
    partnerName?: string,
    shouldOpenWhatsApp = true
  ) => {
    isInitialMountRef.current = false;
    lastSwitchedContactRef.current = phone || partnerName || null;
    openWhatsAppWithContact(phone || '', partnerId, partnerName);
    setActiveTab('atendimento');
    if (shouldOpenWhatsApp && phone) {
      whatsappBridge.openChat(phone, undefined, iframeRef);
    }
  };

  // Se o operador clicar manualmente em uma conversa NOVA/DIFERENTE no WhatsApp Web
  useEffect(() => {
    if (!activePhoneOrName) return;

    const incoming = activePhoneOrName.trim();
    let incomingDigits = incoming.replace(/\D/g, '');
    if (incomingDigits.length < 8) return; // Ignora se não for número de telefone válido (mínimo 8 dígitos)

    if (incomingDigits.startsWith('55') && (incomingDigits.length === 12 || incomingDigits.length === 13)) {
      incomingDigits = incomingDigits.slice(2);
    }

    // No carregamento inicial da página, registra o contato sem forçar a troca da aba Fila para Atendimento
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      lastSwitchedContactRef.current = activePhoneOrName;
      return;
    }

    if (activePhoneOrName !== lastSwitchedContactRef.current) {
      lastSwitchedContactRef.current = activePhoneOrName;
      setActiveTab('atendimento');

      // Se o telefone coincidir estritamente com algum item da fila de cobrança, vincula o parceiroId
      const matchFila = rawFilaItems.find((item) => {
        let itemTelDigits = (item.telefone || '').replace(/\D/g, '');
        if (itemTelDigits.startsWith('55') && (itemTelDigits.length === 12 || itemTelDigits.length === 13)) {
          itemTelDigits = itemTelDigits.slice(2);
        }

        return (
          incomingDigits.length >= 8 &&
          itemTelDigits.length >= 8 &&
          (itemTelDigits.endsWith(incomingDigits.slice(-8)) || incomingDigits.endsWith(itemTelDigits.slice(-8)))
        );
      });

      if (matchFila && matchFila.parceiroId) {
        if (matchFila.parceiroId !== activePartnerId) {
          openWhatsAppWithContact(matchFila.telefone || activePhoneOrName, matchFila.parceiroId, matchFila.parceiroNome);
        }
      } else {
        // Se for um contato externo ou não presente na fila, limpa o parceiroId anterior para consultar no Sankhya pelo telefone
        openWhatsAppWithContact(activePhoneOrName, undefined, undefined);
      }
    }
  }, [activePhoneOrName, rawFilaItems, activePartnerId, openWhatsAppWithContact]);

  // Busca cliente e títulos por parceiroId ou telefone (com proteção contra busca duplicada e race condition)
  const lastFetchedKeyRef = useRef<string>('');

  useEffect(() => {
    // Se não tiver chave selecionada, não dispara busca e não altera o cliente atual
    if (!activePhoneOrName && !activePartnerId) {
      return;
    }

    const currentKey = `${activePartnerId || ''}_${activePhoneOrName || ''}`;

    // Se já foi buscado exatamente com esta mesma chave, evita disparar novamente
    if (lastFetchedKeyRef.current === currentKey) {
      return;
    }

    // Se o cliente atual já possui o mesmo parceiroId, não refaz
    if (cliente && activePartnerId && cliente.codParc === activePartnerId) {
      return;
    }

    const phoneDigits = (activePhoneOrName || '').replace(/\D/g, '');
    const validPhone = phoneDigits.length >= 8 ? activePhoneOrName : undefined;

    // Se não tiver parceiroId E não for um telefone com pelo menos 8 dígitos, não dispara busca
    if (!activePartnerId && !validPhone) {
      return;
    }

    lastFetchedKeyRef.current = currentKey;

    const fetchClienteData = async () => {
      setLoading(true);
      try {
        const resp = await api.get('/api/whatsapp/titulos-por-telefone', {
          params: {
            telefone: validPhone,
            parceiroId: activePartnerId || undefined,
          },
        });

        if (resp.data && resp.data.cliente) {
          setCliente(resp.data.cliente);
          setClientesEncontrados(resp.data.clientes || [resp.data.cliente]);
          const listTitulos: TituloSankhya[] = resp.data.titulos || [];
          setTitulos(listTitulos);
          setTotalEmAberto(resp.data.totalEmAberto || 0);
          setDebugBusca(resp.data);

          const ids = new Set<number>(listTitulos.map((t) => t.id));
          setSelectedIds(ids);
        } else {
          // Quando o cliente não for localizado para o novo número/termo buscado
          setCliente(null);
          setClientesEncontrados([]);
          setTitulos([]);
          setTotalEmAberto(0);
          setSelectedIds(new Set());
          setDebugBusca(resp.data || null);
        }
      } catch (err: any) {
        console.error('Erro ao buscar dados do cliente no Sankhya:', err);
        setCliente(null);
        setClientesEncontrados([]);
        setTitulos([]);
        setTotalEmAberto(0);
        setSelectedIds(new Set());
        setDebugBusca({ erro: err?.message || 'Erro ao conectar ao servidor' });
      } finally {
        setLoading(false);
      }
    };

    fetchClienteData();
  }, [activePhoneOrName, activePartnerId, cliente]);

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
        toast.success('Atendimento Concluído!', 'Mensagem enviada no WhatsApp e atendimento encerrado no Sankhya.');
        // Retorna automaticamente para a Fila para o operador atender o próximo cliente
        setActiveTab('fila');
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
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* 1. Header do Painel com Botões de Apoio */}
      <div className="px-3 py-2.5 border-b border-gray-200 bg-gray-50/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-gray-900 leading-none">
              Financeiro Sankhya
            </h3>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">
              Integração WhatsApp Web
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDiagnosticModalOpen(true)}
            className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-100/70 rounded-lg transition-colors"
            title="Abrir Console de Testes e Diagnóstico da Skill"
          >
            <Terminal className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setConfigModalOpen(true)}
            className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Configurar Modelos de Mensagem"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. Barra de Abas Superiores (Fila de Cobrança vs Atendimento do Cliente) */}
      <div className="grid grid-cols-2 bg-gray-100 p-1 border-b border-gray-200 shrink-0 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('fila')}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all ${
            activeTab === 'fila'
              ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <ListOrdered className="h-3.5 w-3.5 text-emerald-600" />
          <span>Fila de Cobrança</span>
          <span className="ml-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            {countTodos}
          </span>
        </button>

        <button
          type="button"
          disabled={!cliente && !activePhoneOrName}
          onClick={() => setActiveTab('atendimento')}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all ${
            activeTab === 'atendimento'
              ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
              : !cliente && !activePhoneOrName
              ? 'text-gray-400 opacity-60 cursor-not-allowed'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
          title={!cliente && !activePhoneOrName ? 'Selecione um cliente na fila' : 'Ver cobrança do cliente'}
        >
          <User className="h-3.5 w-3.5 text-emerald-600" />
          <span className="truncate max-w-[120px]">
            {cliente ? cliente.nomeParc.split(' ')[0] : 'Atendimento'}
          </span>
          {titulos.length > 0 && (
            <span className="ml-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
              {titulos.length}
            </span>
          )}
        </button>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: FILA DE COBRANÇA (VISÃO PRINCIPAL EM TELA CHEIA)  */}
      {/* ======================================================== */}
      {activeTab === 'fila' && (
        <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
          {/* Barra de Filtros & Busca */}
          <div className="p-3 bg-white border-b border-gray-200 space-y-2.5 shrink-0">
            {/* Campo de Busca */}
            <div className="relative flex items-center w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none select-none z-10" />
              <input
                id="fila-busca-cliente-input"
                name="filaBusca"
                type="text"
                placeholder="Buscar cliente, CNPJ, telefone..."
                value={filaBusca}
                onChange={(e) => setFilaBusca(e.target.value)}
                autoComplete="off"
                spellCheck="false"
                className="w-full rounded-lg border border-gray-300 pl-8 pr-8 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-white cursor-text select-text pointer-events-auto shadow-2xs"
              />
              {filaBusca && (
                <button
                  type="button"
                  onClick={() => setFilaBusca('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors z-10 cursor-pointer"
                  title="Limpar busca"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Pílulas de Filtro Rápido */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter('todos')}
                className={`px-2 py-1 rounded-md border transition-all ${
                  statusFilter === 'todos'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                Todos ({countTodos})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('atraso')}
                className={`px-2 py-1 rounded-md border transition-all ${
                  statusFilter === 'atraso'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                Com Atraso ({countAtraso})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('criticos')}
                className={`px-2 py-1 rounded-md border transition-all ${
                  statusFilter === 'criticos'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                &gt;30 Dias ({countCriticos})
              </button>
            </div>
          </div>

          {/* Lista Ampla e Rolável de Clientes da Fila */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {loadingFila ? (
              <div className="flex flex-col items-center justify-center py-12 text-xs text-gray-400 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                <span>Carregando fila de cobrança Sankhya...</span>
              </div>
            ) : filaAtendimento.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-xs text-gray-500 space-y-2 my-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                <p className="font-bold text-gray-800">Parabéns! Fila limpa.</p>
                <p className="text-[11px] text-gray-500">
                  Nenhum cliente pendente com os filtros selecionados.
                </p>
              </div>
            ) : (
              filaAtendimento.map((item) => {
                const isSelected = cliente && cliente.codParc === item.parceiroId;
                return (
                  <div
                    key={item.parceiroId}
                    onClick={() => handleSelectCustomer(item.telefone, item.parceiroId, item.parceiroNome, true)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all space-y-2.5 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500'
                        : 'border-gray-200 bg-white hover:border-emerald-400 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-gray-900 truncate text-xs leading-tight">
                          {item.parceiroNome}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                          Cód: {item.parceiroId} • {item.telefone ? formatPhone(item.telefone) : 'Sem telefone'}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-black text-rose-700 text-xs block">
                          {item.valorVencido ? formatCurrency(item.valorVencido) : 'R$ 0,00'}
                        </span>
                        {item.diasAtrasoMax && item.diasAtrasoMax > 0 && (
                          <span className="text-[9px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full inline-block mt-0.5">
                            {item.diasAtrasoMax}d atraso
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botões de Ação Direta no Card */}
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCustomer(item.telefone, item.parceiroId, item.parceiroNome, true);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 py-1.5 text-[11px] font-bold text-white shadow-2xs transition-colors"
                        title="Abrir chat no WhatsApp e iniciar cobrança"
                      >
                        <Send className="h-3 w-3" />
                        Cobrar
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenegociarPartner({ id: item.parceiroId, nome: item.parceiroNome });
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 py-1.5 text-[11px] font-bold text-white shadow-2xs transition-colors"
                        title="Abrir simulação de renegociação no Sankhya"
                      >
                        <Handshake className="h-3 w-3" />
                        Renegociar
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCustomer(item.telefone, item.parceiroId, item.parceiroNome, true);
                        }}
                        className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                        title="Ver títulos e abrir no WhatsApp"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: ATENDIMENTO / CLIENTE UNIFICADO (2, 3 e 4 JUNTOS) */}
      {/* ======================================================== */}
      {activeTab === 'atendimento' && (
        <div className="flex-1 flex flex-col min-h-0 bg-white">
          {/* Subheader com Botão Voltar para Fila */}
          <div className="px-3 py-2 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('fila')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Voltar para a Fila</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white text-emerald-700 border border-emerald-200">
                {countTodos}
              </span>
            </button>

            {cliente && (
              <span className="text-[10px] font-mono text-emerald-900 truncate max-w-[140px]">
                Cód: {cliente.codParc}
              </span>
            )}
          </div>

          {/* Conteúdo Rolável Unificado */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2.5">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
                <span className="text-xs font-bold text-gray-700">Carregando dados do cliente...</span>
                <span className="text-[11px] text-gray-400">Consultando cadastro e títulos em aberto no Sankhya</span>
              </div>
            ) : !cliente ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 text-xs text-amber-900 space-y-3 text-center my-6 shadow-2xs">
                <AlertTriangle className="h-8 w-8 text-amber-600 mx-auto" />
                <div>
                  <p className="font-extrabold text-sm text-amber-950">
                    {activePhoneOrName ? 'Cliente não localizado no Sankhya' : 'Nenhum cliente selecionado'}
                  </p>
                  <p className="text-[11px] text-amber-700 mt-1">
                    {activePhoneOrName
                      ? 'Nenhum cadastro de parceiro ou contato correspondeu aos dados recebidos do WhatsApp:'
                      : 'Volte para a fila e selecione um cliente para visualizar os títulos e enviar mensagens.'}
                  </p>
                </div>

                {activePhoneOrName && (
                  <div className="bg-white/90 border border-amber-300 rounded-lg p-2.5 mx-auto max-w-xs text-left shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-amber-800 font-bold mb-1">
                      <span>Termo recebido pelo Frontend:</span>
                      <span className="font-mono bg-amber-100 px-1.5 py-0.5 rounded text-amber-900">
                        {activePhoneOrName.replace(/\D/g, '').length >= 8 ? 'Telefone' : 'Nome / Contato'}
                      </span>
                    </div>
                    <div className="font-mono text-xs font-black text-gray-900 break-all select-all bg-gray-50 border border-gray-200 rounded p-1.5">
                      {activePhoneOrName}
                    </div>

                    {debugBusca && (
                      <div className="border-t border-amber-200 pt-2 space-y-1.5 text-[10px]">
                        <div className="font-bold text-amber-950 flex items-center justify-between">
                          <span>Diagnóstico Backend:</span>
                          <span className="text-gray-500 font-mono">
                            Dígitos: {debugBusca.debugBuscaTelefone?.ultimosDigitos || 'Nenhum'}
                          </span>
                        </div>
                        {debugBusca.debugBuscaTelefone?.sqlExecutado && (
                          <details className="mt-1">
                            <summary className="cursor-pointer font-semibold text-amber-800 hover:text-amber-950">
                              Ver SQL executado no Sankhya
                            </summary>
                            <pre className="mt-1 p-1.5 bg-gray-900 text-gray-100 rounded text-[9px] overflow-x-auto whitespace-pre-wrap font-mono">
                              {debugBusca.debugBuscaTelefone.sqlExecutado}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-1 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('fila')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-2xs transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Ir para a Fila de Cobrança
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* SELETOR DE PARCEIRO CASO EXISTA MAIS DE UM CADASTRO VINCULADO */}
                {clientesEncontrados.length > 1 && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-2.5 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-blue-600" />
                        {clientesEncontrados.length} cadastros vinculados:
                      </span>
                      <span className="text-[10px] text-blue-700">Selecione para alternar</span>
                    </div>

                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {clientesEncontrados.map((c) => {
                        const isSelected = cliente?.codParc === c.codParc;
                        return (
                          <button
                            key={c.codParc}
                            type="button"
                            onClick={() => {
                              openWhatsAppWithContact(c.telefone || activePhoneOrName || '', c.codParc, c.nomeParc);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all flex items-center justify-between border ${
                              isSelected
                                ? 'bg-white border-blue-400 font-bold text-blue-900 shadow-2xs ring-1 ring-blue-300'
                                : 'bg-white/60 border-blue-100 text-gray-700 hover:bg-white hover:border-blue-200'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <span className="font-extrabold text-blue-950 block truncate">
                                {c.nomeParc}
                              </span>
                              <span className="text-[10px] text-gray-500 font-mono">
                                Cód: {c.codParc} • {formatCnpjCpf(c.cnpjCpf)}
                              </span>
                            </div>
                            {isSelected && (
                              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. CARD DO CLIENTE ATIVO */}
                <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-2xs space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 pr-2">
                      <h4 className="text-xs font-extrabold text-gray-900 leading-tight truncate">
                        {cliente.nomeParc}
                      </h4>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                        {formatCnpjCpf(cliente.cnpjCpf)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setRenegociarPartner({ id: cliente.codParc, nome: cliente.nomeParc })}
                        className="inline-flex items-center gap-1 rounded-md bg-amber-500 hover:bg-amber-600 px-2 py-1 text-[10px] font-bold text-white shadow-2xs transition-colors"
                        title="Simular / Confirmar Renegociação no Sankhya"
                      >
                        <Handshake className="h-3 w-3" />
                        Renegociar
                      </button>

                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700 border border-emerald-200">
                        {cliente.situacao === 'A' ? 'Ativo' : 'Sankhya OK'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-gray-100">
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

                {/* 3. TÍTULOS EM ABERTO (TGFFIN) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-gray-400 hover:text-emerald-600 transition-colors"
                        title={selectedIds.size === titulos.length ? 'Desmarcar todos' : 'Selecionar todos'}
                      >
                        {selectedIds.size === titulos.length && titulos.length > 0 ? (
                          <CheckSquare className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-600">
                        Títulos em Aberto ({selectedIds.size}/{titulos.length})
                      </span>
                    </div>
                    <span className="text-xs font-black text-rose-700">
                      {formatCurrency(totalEmAberto)}
                    </span>
                  </div>

                  {titulos.length === 0 ? (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-center text-xs text-emerald-800 font-medium">
                      <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-600 mb-1" />
                      Nenhum título em aberto no Sankhya!
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
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

                {/* 4. AÇÕES RÁPIDAS & EDITOR DE MENSAGEM WHATSAPP */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-2">
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

                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-700">
                      Mensagem para o WhatsApp:
                    </label>
                    <textarea
                      rows={5}
                      value={mensagemEditada}
                      onChange={(e) => setMensagemEditada(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-xs font-sans text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed shadow-2xs"
                      placeholder="A mensagem interpolada aparecerá aqui..."
                    />

                    <button
                      type="button"
                      onClick={handleEnviarMensagem}
                      disabled={sending || !mensagemEditada.trim()}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Inserir & Enviar no WhatsApp
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
