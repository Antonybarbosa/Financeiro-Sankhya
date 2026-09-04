'use client';

import { useState, useEffect, useRef } from 'react';
import { whatsappBridge } from '@/lib/whatsappBridge';
import { SankhyaCustomerContextPanel } from './SankhyaCustomerContextPanel';
import { WhatsAppSkillDiagnosticModal } from './WhatsAppSkillDiagnosticModal';
import { useUIStore } from '@/store/uiStore';
import { useWhatsAppStore } from '@/store/whatsappStore';
import {
  MessageSquare,
  ShieldAlert,
  Search,
  ExternalLink,
  Info,
  CheckCircle,
  RotateCw,
  PanelRightClose,
  PanelRightOpen,
  ChevronLeft,
  ChevronRight,
  Building2,
  Terminal,
} from 'lucide-react';

export function WhatsAppEmbeddedTab() {
  const { activePhoneOrName, openWhatsAppWithContact } = useWhatsAppStore();
  const [manualPhone, setManualPhone] = useState('');
  const [extensionDetected, setExtensionDetected] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();

  // Escutar eventos de mudança de chat vindos da extensão Chrome
  useEffect(() => {
    const unsubscribe = whatsappBridge.subscribeChatChange((info) => {
      const phoneRaw = (info.phone || '').trim();
      const phoneDigits = phoneRaw.replace(/\D/g, '');

      // Só processa se houver telefone real extraído (mínimo 8 dígitos)
      if (phoneDigits.length >= 8) {
        const cleanPhone =
          phoneDigits.startsWith('55') && (phoneDigits.length === 12 || phoneDigits.length === 13)
            ? phoneDigits.slice(2)
            : phoneDigits;

        if (cleanPhone.length >= 8 && cleanPhone.length <= 11) {
          const state = useWhatsAppStore.getState();
          const currentActive = (state.activePhoneOrName || '').trim();
          const currentDigits = currentActive.replace(/\D/g, '');

          // Se for exatamente o mesmo contato já ativo (últimos 8 dígitos iguais), ignora e não recarrega
          if (
            currentDigits.length >= 8 &&
            cleanPhone.length >= 8 &&
            (currentDigits.endsWith(cleanPhone.slice(-8)) || cleanPhone.endsWith(currentDigits.slice(-8)))
          ) {
            return;
          }

          // Atualiza a store global com o novo contato pesquisando no Sankhya pelo telefone
          useWhatsAppStore.getState().openWhatsAppWithContact(cleanPhone, undefined, info.name);
          setPanelOpen(true);
        }
      }
    });

    const checkInterval = setInterval(() => {
      if (whatsappBridge.isExtensionActive()) {
        setExtensionDetected((prev) => (prev ? prev : true));
      }
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(checkInterval);
    };
  }, []);

  const handleReloadIframe = () => {
    setIframeKey((prev) => prev + 1);
  };

  const handleOpenPopout = () => {
    window.open(
      'https://web.whatsapp.com',
      'WhatsAppWebWindow',
      'width=1050,height=850,menubar=no,toolbar=no,location=no,status=no'
    );
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualPhone.trim()) {
      openWhatsAppWithContact(manualPhone.trim(), undefined, undefined);
      setPanelOpen(true);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col h-full bg-gray-50 overflow-hidden min-w-0">
      {/* Banner de Instruções se a Extensão ainda não tiver sido detectada */}
      {!extensionDetected && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Dica de Integração:</strong> Recarregue a extensão no `chrome://extensions/` e aperte F5 para ativar a sincronização em tempo real.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReloadIframe}
              className="inline-flex items-center gap-1 bg-amber-600 text-white px-2.5 py-1 rounded-md font-bold text-[11px] hover:bg-amber-700 transition-colors shadow-2xs"
            >
              <RotateCw className="h-3 w-3" />
              Recarregar Iframe
            </button>
            <button
              type="button"
              onClick={handleOpenPopout}
              className="inline-flex items-center gap-1 bg-white text-gray-800 border border-amber-300 px-2.5 py-1 rounded-md font-bold text-[11px] hover:bg-amber-100 transition-colors"
            >
              <ExternalLink className="h-3 w-3 text-amber-700" />
              Janela Auxiliar
            </button>
          </div>
        </div>
      )}

      {/* Barra de Ferramentas / Status Superior */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold shadow-xs">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              WhatsApp Web Integrado
              {extensionDetected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800 border border-emerald-300">
                  <CheckCircle className="h-3 w-3 text-emerald-600" />
                  Extensão Conectada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800 border border-amber-300">
                  Modo Padrão
                </span>
              )}
            </h1>
            <p className="text-[11px] text-gray-500">
              Navegação nativa do WhatsApp com sincronização em tempo real do cadastro financeiro.
            </p>
          </div>
        </div>

        {/* Controles & Botão de Expansão do Painel */}
        <div className="flex items-center gap-2">
          {/* Botão Console de Testes & Diagnóstico da Skill */}
          <button
            type="button"
            onClick={() => setDiagnosticOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 px-3 py-1.5 text-xs font-bold transition-all shadow-2xs"
            title="Abrir Console de Testes e Diagnóstico da Skill"
          >
            <Terminal className="h-4 w-4 text-purple-600" />
            <span>Testes da Skill</span>
          </button>

          <button
            type="button"
            onClick={handleReloadIframe}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
            title="Recarregar tela do WhatsApp Web"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          {/* Botão de Toggle do Painel Financeiro Sankhya */}
          <button
            type="button"
            onClick={() => setPanelOpen(!panelOpen)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all shadow-2xs ${
              panelOpen
                ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Painel Sankhya</span>
            {panelOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Conteúdo Principal Split Screen */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Lado Esquerdo: WhatsApp Web Iframe (Ocupa 100% da tela quando painel fechado) */}
        <div className="flex-1 relative bg-gray-100 flex flex-col min-w-0 h-full">
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src="https://web.whatsapp.com"
            className="w-full h-full border-0"
            title="WhatsApp Web"
            allow="clipboard-read; clipboard-write; microphone; camera"
          />

          <div className="absolute bottom-2 left-2 bg-gray-900/80 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1.5 pointer-events-none z-10">
            <Info className="h-3 w-3 text-emerald-400" />
            Sua sessão do WhatsApp permanece salva no navegador.
          </div>
        </div>

        {/* Lado Direito: Painel Financeiro Sankhya (Mais Amplo) */}
        {panelOpen && (
          <div className="w-80 lg:w-96 shrink-0 h-full shadow-xl transition-all duration-200 ease-in-out z-20">
            <SankhyaCustomerContextPanel
              activePhoneOrName={activePhoneOrName}
              iframeRef={iframeRef.current}
            />
          </div>
        )}
      </div>

      {/* Modal Console de Testes & Diagnóstico da Skill */}
      <WhatsAppSkillDiagnosticModal
        open={diagnosticOpen}
        onClose={() => setDiagnosticOpen(false)}
        iframeRef={iframeRef.current}
      />
    </div>
  );
}
