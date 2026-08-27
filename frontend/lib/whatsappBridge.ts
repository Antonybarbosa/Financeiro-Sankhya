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
    
    // Disparar para a extensão ou iframe
    if (iframeRef && iframeRef.contentWindow) {
      iframeRef.contentWindow.postMessage(payload, '*');
    } else if (typeof window !== 'undefined') {
      window.postMessage(payload, '*');
    }
  }

  public isExtensionActive() {
    return this.extensionActive;
  }
}

export const whatsappBridge = new WhatsAppBridge();
