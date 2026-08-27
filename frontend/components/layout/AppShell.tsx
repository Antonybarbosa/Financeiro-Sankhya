'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useWhatsAppStore } from '@/store/whatsappStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { GlobalWhatsAppDrawer } from '@/components/whatsapp/GlobalWhatsAppDrawer';
import { Loader2, MessageSquare } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const { toggleDrawer, isDrawerOpen } = useWhatsAppStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isWhatsAppPage = pathname === '/whatsapp';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 relative">
      <Sidebar />
      <main className="flex-1 min-w-0 h-screen overflow-hidden flex flex-col relative">
        {isWhatsAppPage ? (
          children
        ) : (
          <div className="flex-1 overflow-y-auto mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        )}
      </main>

      {/* WhatsApp Web Drawer Persistente */}
      <GlobalWhatsAppDrawer />

      {/* Botão Flutuante do WhatsApp em qualquer tela do sistema */}
      {!isWhatsAppPage && (
        <button
          type="button"
          onClick={toggleDrawer}
          className={`fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full px-4 py-3 text-xs font-extrabold text-white shadow-xl transition-all hover:scale-105 active:scale-95 ${
            isDrawerOpen
              ? 'bg-emerald-700 ring-2 ring-emerald-400'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
          title="Abrir/Fechar WhatsApp Web sem perder sua tarefa"
        >
          <div className="relative">
            <MessageSquare className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-200"></span>
            </span>
          </div>
          <span>WhatsApp Web</span>
        </button>
      )}
    </div>
  );
}
