'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useWhatsAppStore } from '@/store/whatsappStore';
import { useUIStore } from '@/store/uiStore';
import { whatsappBridge } from '@/lib/whatsappBridge';
import { SankhyaCustomerContextPanel } from './SankhyaCustomerContextPanel';
import { WhatsAppSkillDiagnosticModal } from './WhatsAppSkillDiagnosticModal';
import {
  MessageSquare,
  X,
  Maximize2,
  RotateCw,
  Search,
  CheckCircle,
  ExternalLink,
  ShieldAlert,
  Info,
  Terminal,
} from 'lucide-react';

export function GlobalWhatsAppDrawer() {
  const pathname = usePathname();
  const { isSidebarCollapsed } = useUIStore();
  const {
    isDrawerOpen,
    activePhoneOrName,
    toggleDrawer,
    setDrawerOpen,
    openWhatsAppWithContact,
  } = useWhatsAppStore();

  const [extensionDetected, setExtensionDetected] = useState(false);
  const [manualPhone, setManualPhone] = useState('');
  const [iframeKey, setIframeKey] = useState(0);
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const isWhatsAppPageRoute = pathname === '/whatsapp';
  const shouldDisplay = isDrawerOpen && !isWhatsAppPageRoute;

  // Escutar eventos de mudança de chat vindos da extensão Chrome
  useEffect(() => {
    const unsubscribe = whatsappBridge.subscribeChatChange((info) => {
      const incomingRaw = (info.phone || info.phoneOrName || '').trim();
      const infoDigits = incomingRaw.replace(/\D/g, '');

      // Só aceita se houver pelo menos 8 dígitos de telefone (ignora nomes puros)
      if (infoDigits.length >= 8) {
        const cleanPhone =
          infoDigits.startsWith('55') && (infoDigits.length === 12 || infoDigits.length === 13)
            ? infoDigits.slice(2)
            : infoDigits;

        const state = useWhatsAppStore.getState();
        const currentActive = (state.activePhoneOrName || '').trim();
        const currentDigits = currentActive.replace(/\D/g, '');

        // 1. Se for exatamente o mesmo número, ignora
        if (cleanPhone === currentActive || (currentDigits.length >= 8 && currentDigits.endsWith(cleanPhone.slice(-8)))) {
          return;
        }

        // Só atualiza se for uma conversa com telefone validado
        openWhatsAppWithContact(cleanPhone, undefined, info.name);
      } else if (info.name && info.name.trim()) {
        openWhatsAppWithContact(info.name.trim(), undefined, info.name.trim());
      }
    });

    const checkInterval = setInterval(() => {
      if (whatsappBridge.isExtensionActive()) {
        setExtensionDetected(true);
      }
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(checkInterval);
    };
  }, [openWhatsAppWithContact]);

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
      openWhatsAppWithContact(manualPhone.trim());
    }
  };

  return (
    <div
      style={{ display: shouldDisplay ? 'flex' : 'none' }}
      className={`fixed inset-y-0 right-0 z-50 bg-white shadow-2xl transition-all duration-300 flex flex-col border-l border-gray-300 ${
        isWhatsAppPageRoute
          ? 'w-full flex-1 min-w-0 static h-full shadow-none'
          : isSidebarCollapsed
          ? 'left-16 w-auto'
          : 'left-64 w-auto'
      }`}
    >
      {/* Barra de Ferramentas / Header do Drawer */}
      <div className="bg-gray-900 text-white px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold shadow-xs">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold flex items-center gap-2">
              WhatsApp Web Integrado
              {extensionDetected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950 px-2 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-800">
                  <CheckCircle className="h-2.5 w-2.5 text-emerald-400" />
                  Extensão Conectada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-950 px-2 py-0.5 text-[9px] font-bold text-amber-400 border border-amber-800">
                  Modo Padrão
                </span>
              )}
            </h3>
          </div>
        </div>

        {/* Controles do Drawer */}
        <div className="flex items-center gap-2">
          {/* Botão Console de Testes & Diagnóstico da Skill */}
          <button
            type="button"
            onClick={() => setDiagnosticOpen(true)}
            className="inline-flex items-center gap-1 bg-purple-950 text-purple-300 hover:bg-purple-900 border border-purple-800 px-2.5 py-1 rounded text-[11px] font-bold transition-colors shadow-2xs"
            title="Abrir Console de Testes da Skill WhatsApp"
          >
            <Terminal className="h-3.5 w-3.5 text-purple-400" />
            <span>Testes da Skill</span>
          </button>

          <button
            type="button"
            onClick={handleReloadIframe}
            className="p-1 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            title="Recarregar WhatsApp"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          {!isWhatsAppPageRoute && (
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="p-1 rounded-md bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white transition-colors"
              title="Fechar Drawer (Sessão Continua Ativa)"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo Split Screen: Iframe do WhatsApp + Painel Sankhya */}
      <div className="flex-1 flex overflow-hidden">
        {/* Lado Esquerdo: Iframe WhatsApp Web (Mantido vivo no DOM) */}
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
            Sessão ativa contínua no sistema.
          </div>
        </div>

        {/* Lado Direito: Painel Financeiro Sankhya (Mais Amplo) */}
        <div className="w-80 lg:w-96 shrink-0 h-full border-l border-gray-200">
          <SankhyaCustomerContextPanel
            activePhoneOrName={activePhoneOrName}
            iframeRef={iframeRef.current}
          />
        </div>
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
