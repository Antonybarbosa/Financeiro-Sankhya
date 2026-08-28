import { create } from 'zustand';

export interface WhatsAppLogEntry {
  id: string;
  timestamp: string;
  direction: 'OUT' | 'IN' | 'EVENT' | 'SYS';
  type: string;
  action?: string;
  payload?: any;
  data?: any;
  error?: any;
  durationMs?: number;
}

interface WhatsAppTestState {
  logs: WhatsAppLogEntry[];
  extensionReady: boolean;
  lastHeartbeat: string | null;
  activeChat: string | null;
  addLog: (entry: Omit<WhatsAppLogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  setExtensionReady: (ready: boolean) => void;
  setLastHeartbeat: (timestamp: string) => void;
  setActiveChat: (chat: string | null) => void;
}

export const useWhatsAppTestStore = create<WhatsAppTestState>((set) => ({
  logs: [],
  extensionReady: false,
  lastHeartbeat: null,
  activeChat: null,

  addLog: (entry) =>
    set((state) => ({
      logs: [
        {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }) + '.' + String(new Date().getMilliseconds()).padStart(3, '0'),
          ...entry,
        },
        ...state.logs.slice(0, 99), // Manter os últimos 100 logs
      ],
    })),

  clearLogs: () => set({ logs: [] }),
  setExtensionReady: (ready) => set({ extensionReady: ready }),
  setLastHeartbeat: (timestamp) => set({ lastHeartbeat: timestamp }),
  setActiveChat: (chat) => set({ activeChat: chat }),
}));
