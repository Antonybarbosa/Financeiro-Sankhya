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
    
    // 1. Disparar para todos os iframes do documento
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
    const targetUrl = `https://web.whatsapp.com/send?phone=${fullPhone}${text ? `&text=${encodeURIComponent(text)}` : ''}`;

    console.log('[Sankhya Bridge] Abrindo conversa com número:', fullPhone, targetUrl);

    // 1. Atualiza o src de todos os iframes do WhatsApp no DOM diretamente
    if (typeof document !== 'undefined') {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((ifr) => {
        try {
          if (ifr.src.includes('whatsapp.com') || ifr.title.includes('WhatsApp')) {
            ifr.src = targetUrl;
            console.log('[Sankhya Bridge] Iframe WhatsApp navegado com sucesso para:', targetUrl);
          }
          if (ifr.contentWindow) {
            ifr.contentWindow.postMessage({ type: 'SANKHYA_NAVIGATE_PHONE', phone: fullPhone, text: text || '' }, '*');
          }
        } catch (e) {}
      });
    }

    // 2. Disparar na referência específica se fornecida
    if (iframeRef) {
      try {
        iframeRef.src = targetUrl;
      } catch (e) {}
    }

    // 3. Disparar postMessage geral
    if (typeof window !== 'undefined') {
      window.postMessage({ type: 'SANKHYA_NAVIGATE_PHONE', phone: fullPhone, text: text || '' }, '*');
    }
  }

  public isExtensionActive() {
    return this.extensionActive;
  }
}

export const whatsappBridge = new WhatsAppBridge();
