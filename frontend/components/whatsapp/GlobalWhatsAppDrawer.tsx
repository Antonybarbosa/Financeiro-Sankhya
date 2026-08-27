'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useWhatsAppStore } from '@/store/whatsappStore';
import { useUIStore } from '@/store/uiStore';
import { whatsappBridge } from '@/lib/whatsappBridge';
import { SankhyaCustomerContextPanel } from './SankhyaCustomerContextPanel';
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
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const isWhatsAppPageRoute = pathname === '/whatsapp';
  const shouldDisplay = isDrawerOpen || isWhatsAppPageRoute;

  // Escutar eventos de mudança de chat vindos da extensão Chrome
  useEffect(() => {
    const unsubscribe = whatsappBridge.subscribeChatChange((info) => {
      if (info.phoneOrName) {
        openWhatsAppWithContact(info.phoneOrName);
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

        {/* Lado Direito: Painel Financeiro Sankhya (Mais Estreito) */}
        <div className="w-72 lg:w-80 shrink-0 h-full border-l border-gray-200">
          <SankhyaCustomerContextPanel
            activePhoneOrName={activePhoneOrName}
            iframeRef={iframeRef.current}
          />
        </div>
      </div>
    </div>
  );
}
