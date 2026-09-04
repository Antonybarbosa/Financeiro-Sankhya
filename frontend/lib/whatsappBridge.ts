// Ponte de comunicação bidirecional com a Skill do WhatsApp Web e Console de Testes

import { useWhatsAppTestStore } from '@/store/whatsappTestStore';

export interface WhatsAppChatInfo {
  phoneOrName: string;
  name?: string;
  phone?: string | null;
}

export type WhatsAppChatChangeListener = (info: WhatsAppChatInfo) => void;

export interface WhatsAppCommandPayload {
  action: 'status' | 'get_current_chat' | 'find_contact' | 'open_chat' | 'type_message' | 'send_message' | string;
  payload?: any;
  requestId?: string;
}

export interface WhatsAppResponse {
  type: 'WHATSAPP_RESPONSE';
  requestId: string;
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
  };
}

class WhatsAppBridge {
  private listeners: WhatsAppChatChangeListener[] = [];
  private pendingRequests: Map<string, { resolve: (res: any) => void; reject: (err: any) => void; startTime: number; action: string }> = new Map();
  private extensionActive = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handleWindowMessage.bind(this));
    }
  }

  private handleWindowMessage(event: MessageEvent) {
    if (!event.data || typeof event.data !== 'object') return;

    const data = event.data;

    // 1. Respostas de Comandos Semânticos (WHATSAPP_RESPONSE)
    if (data.type === 'WHATSAPP_RESPONSE' && data.requestId) {
      const pending = this.pendingRequests.get(data.requestId);
      if (pending) {
        const durationMs = Date.now() - pending.startTime;
        this.pendingRequests.delete(data.requestId);

        useWhatsAppTestStore.getState().addLog({
          direction: 'IN',
          type: 'WHATSAPP_RESPONSE',
          action: pending.action,
          payload: { requestId: data.requestId },
          data: data.data,
          error: data.error,
          durationMs,
        });

        if (data.success) {
          pending.resolve(data.data);
        } else {
          pending.reject(new Error(data.error?.message || 'Comando falhou'));
        }
      }
    }

    // 2. Eventos da Interface (WHATSAPP_EVENT)
    else if (data.type === 'WHATSAPP_EVENT') {
      const evt = data.event;

      if (evt === 'whatsapp_ready') {
        this.extensionActive = true;
        const testStore = useWhatsAppTestStore.getState();
        if (!testStore.extensionReady) {
          testStore.setExtensionReady(true);
          testStore.setLastHeartbeat(new Date().toLocaleTimeString('pt-BR'));
        }
      } else {
        useWhatsAppTestStore.getState().addLog({
          direction: 'EVENT',
          type: 'WHATSAPP_EVENT',
          action: evt,
          data: data.data,
        });
      }

      if (evt === 'chat_changed') {
        const chatData = data.data || {};
        const phone = chatData.phone || (chatData.phoneOrName && chatData.phoneOrName.replace(/\D/g, '').length >= 8 ? chatData.phoneOrName : null);
        const name = chatData.name || (chatData.phoneOrName && !phone ? chatData.phoneOrName : '');
        const phoneOrName = phone || name || '';
        
        if (phoneOrName) {
          useWhatsAppTestStore.getState().setActiveChat(phoneOrName);
        }
        this.notifyListeners({ phoneOrName, name, phone });
      }
    }

    // 3. Heartbeats Legados
    else if (data.type === 'SANKHYA_BRIDGE_READY') {
      this.extensionActive = true;
      useWhatsAppTestStore.getState().setExtensionReady(true);
      useWhatsAppTestStore.getState().setLastHeartbeat(new Date().toLocaleTimeString('pt-BR'));
    } else if (data.type === 'SANKHYA_CHAT_CHANGED' || data.type === 'SANKHYA_CURRENT_CHAT_RESPONSE') {
      const rawDigits = (data.phoneOrName || '').replace(/\D/g, '');
      const validPhone = rawDigits.length >= 8 ? data.phoneOrName : '';
      if (validPhone) {
        useWhatsAppTestStore.getState().setActiveChat(validPhone);
      }
      this.notifyListeners({ phoneOrName: validPhone });
    }
  }

  public subscribeChatChange(listener: WhatsAppChatChangeListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(info: WhatsAppChatInfo) {
    this.listeners.forEach((listener) => listener(info));
  }

  /**
   * Envia comando semântico e retorna Promise com resposta e medição de tempo
   */
  public sendCommandAsync(cmd: WhatsAppCommandPayload, iframeRef?: HTMLIFrameElement | null, timeoutMs = 25000): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = cmd.requestId || 'req_' + Math.random().toString(36).substring(2, 9);
      const payload = {
        type: 'WHATSAPP_COMMAND',
        requestId,
        action: cmd.action,
        payload: cmd.payload || {},
      };

      const timer = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          useWhatsAppTestStore.getState().addLog({
            direction: 'SYS',
            type: 'TIMEOUT',
            action: cmd.action,
            error: { code: 'TIMEOUT', message: `Comando '${cmd.action}' expirou após ${timeoutMs}ms` },
          });
          reject(new Error(`Timeout: Sem resposta da Skill para '${cmd.action}' em ${timeoutMs}ms`));
        }
      }, timeoutMs);

      this.pendingRequests.set(requestId, {
        resolve: (res) => {
          clearTimeout(timer);
          resolve(res);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
        startTime: Date.now(),
        action: cmd.action,
      });

      useWhatsAppTestStore.getState().addLog({
        direction: 'OUT',
        type: 'WHATSAPP_COMMAND',
        action: cmd.action,
        payload: cmd.payload,
      });

      let dispatched = false;

      // 1. Se um iframeRef específico foi fornecido, envia diretamente para ele
      if (iframeRef && iframeRef.contentWindow) {
        try {
          iframeRef.contentWindow.postMessage(payload, '*');
          dispatched = true;
        } catch (e) {}
      }

      // 2. Se não foi despachado via ref, busca o iframe do WhatsApp Web na tela
      if (!dispatched && typeof document !== 'undefined') {
        const iframes = document.querySelectorAll('iframe');
        for (let i = 0; i < iframes.length; i++) {
          const ifr = iframes[i];
          try {
            if (ifr.contentWindow) {
              ifr.contentWindow.postMessage(payload, '*');
              dispatched = true;
              break;
            }
          } catch (e) {}
        }
      }
    });
  }

  public sendTextToWhatsApp(text: string, iframeRef?: HTMLIFrameElement | null) {
    return this.sendCommandAsync({ action: 'send_message', payload: { message: text } }, iframeRef).catch((err) => {
      console.warn('[WhatsApp Skill] Aviso em sendTextToWhatsApp:', err.message);
    });
  }

  public openChat(phone: string, text?: string, iframeRef?: HTMLIFrameElement | null) {
    if (!phone) return Promise.resolve();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8) return Promise.resolve();
    const fullPhone = digits.length <= 11 && !digits.startsWith('55') ? '55' + digits : digits;

    return this.sendCommandAsync({ action: 'open_chat', payload: { phone: fullPhone, message: text } }, iframeRef).catch((err) => {
      console.warn('[WhatsApp Skill] Aviso em openChat:', err.message);
    });
  }

  public isExtensionActive() {
    return this.extensionActive;
  }
}

export const whatsappBridge = new WhatsAppBridge();
