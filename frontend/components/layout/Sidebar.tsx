'use client';

import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { authApi } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PhoneCall,
  Users,
  MessageSquare,
  LogOut,
  Wallet,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/cobranca', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/cobranca/fila', label: 'Fila de Cobrança', icon: PhoneCall },
  { href: '/whatsapp', label: 'WhatsApp Web', icon: MessageSquare },
  { href: '/clientes', label: 'Clientes', icon: Users },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    queryClient.clear();
    logout();
    router.push('/login');
  };

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out',
        isSidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div
        className={cn(
          'flex items-center border-b border-gray-200 py-5 transition-all',
          isSidebarCollapsed ? 'justify-between px-3' : 'justify-between px-6'
        )}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          {!isSidebarCollapsed && (
            <div className="whitespace-nowrap transition-opacity duration-200">
              <h1 className="text-sm font-bold text-gray-900">Financeiro</h1>
              <p className="text-xs text-gray-500">Sankhya Cobrança</p>
            </div>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              title={isSidebarCollapsed ? item.label : undefined}
              className={cn(
                'flex w-full items-center rounded-md py-2.5 text-sm font-medium transition-colors',
                isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isSidebarCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 px-3 py-4">
        <div
          className={cn(
            'flex items-center gap-3 py-2',
            isSidebarCollapsed ? 'justify-center px-0' : 'px-3'
          )}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700"
            title={isSidebarCollapsed ? user?.name || 'Usuário' : undefined}
          >
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          {!isSidebarCollapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-gray-900">
                {user?.name || 'Usuário'}
              </p>
              <p className="text-xs text-gray-500">COD: {user?.codusu || '--'}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          title={isSidebarCollapsed ? 'Sair' : undefined}
          className={cn(
            'mt-2 flex w-full items-center rounded-md text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600',
            isSidebarCollapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2'
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isSidebarCollapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
