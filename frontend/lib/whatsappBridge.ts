// Ponte de comunicação entre a aplicação Next.js e a extensão / Iframe do WhatsApp Web

export interface WhatsAppChatInfo {
  phoneOrName: string;
}

export type WhatsAppChatChangeListener = (info: WhatsAppChatInfo) => void;

class WhatsAppBridge {
  private listeners: WhatsAppChatChangeListener[] = [];
  private extensionActive = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handleWindowMessage.bind(this));
    }
  }

  private handleWindowMessage(event: MessageEvent) {
    if (!event.data || typeof event.data !== 'object') return;

    if (event.data.type === 'SANKHYA_BRIDGE_READY') {
      this.extensionActive = true;
      console.log('[Sankhya Frontend] Extensão WhatsApp Bridge detectada e ativa.');
    } else if (event.data.type === 'SANKHYA_CHAT_CHANGED' || event.data.type === 'SANKHYA_CURRENT_CHAT_RESPONSE') {
      const phoneOrName = event.data.phoneOrName || '';
      this.notifyListeners({ phoneOrName });
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

  public sendTextToWhatsApp(text: string, iframeRef?: HTMLIFrameElement | null) {
    const payload = { type: 'SANKHYA_SEND_TEXT', text };
    
    // 1. Disparar para todos os iframes do documento (sem recarregar o iframe!)
    if (typeof document !== 'undefined') {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((ifr) => {
        try {
          if (ifr.contentWindow) {
            ifr.contentWindow.postMessage(payload, '*');
          }
        } catch (e) {}
      });
    }

    // 2. Disparar diretamente para a referência se fornecida
    if (iframeRef && iframeRef.contentWindow) {
      try {
        iframeRef.contentWindow.postMessage(payload, '*');
      } catch (e) {}
    }

    // 3. Disparar para o window
    if (typeof window !== 'undefined') {
      window.postMessage(payload, '*');
    }
  }

  public navigateToPhone(phone: string, text?: string, iframeRef?: HTMLIFrameElement | null) {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.length <= 11 ? '55' + cleanPhone : cleanPhone;
    const payload = { type: 'SANKHYA_NAVIGATE_PHONE', phone: fullPhone, text: text || '' };

    console.log('[Sankhya Bridge] Solicitando abertura de chat sem recarregar:', fullPhone);

    // Envia instrução postMessage para o iframe (abre via busca nativa sem recarregar a página!)
    if (typeof document !== 'undefined') {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((ifr) => {
        try {
          if (ifr.contentWindow) {
            ifr.contentWindow.postMessage(payload, '*');
          }
        } catch (e) {}
      });
    }

    if (iframeRef && iframeRef.contentWindow) {
      try {
        iframeRef.contentWindow.postMessage(payload, '*');
      } catch (e) {}
    }

    if (typeof window !== 'undefined') {
      window.postMessage(payload, '*');
    }
  }

  public isExtensionActive() {
    return this.extensionActive;
  }
}

export const whatsappBridge = new WhatsAppBridge();
