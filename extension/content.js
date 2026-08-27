// Content script injetado em https://web.whatsapp.com/*
// Comunicação com o sistema Financeiro Sankhya (parent frame ou web app)

(function () {
  console.log("[Sankhya Bridge] Content script carregado no WhatsApp Web.");

  let lastSelectedPhone = "";

  // Notificar a janela pai que a extensão Sankhya está pronta
  function notifyBridgeReady() {
    try {
      window.parent.postMessage({ type: "SANKHYA_BRIDGE_READY" }, "*");
    } catch (e) {}
  }

  // Tenta extrair o telefone ou dados do contato selecionado no WhatsApp Web
  function extractActiveChatPhone() {
    try {
      // 1. Tentar obter pelo título do header do chat
      const headerTitle = document.querySelector("#main header span[title]");
      if (!headerTitle) return null;

      const titleText = headerTitle.getAttribute("title") || headerTitle.innerText || "";
      
      // Se for um número de telefone no título (ex: +55 11 99999-8888 ou 11 999998888)
      const digitsOnly = titleText.replace(/\D/g, "");
      if (digitsOnly.length >= 8) {
        return digitsOnly;
      }

      // 2. Tentar buscar em elementos com atributos data-jid ou img da foto do perfil
      const profileImg = document.querySelector("#main header img[src*='whatsapp.net']");
      if (profileImg) {
        const src = profileImg.getAttribute("src") || "";
        const match = src.match(/\/u\/(\d+)/) || src.match(/(\d+)@/);
        if (match && match[1]) {
          return match[1];
        }
      }

      return titleText; // Retorna o nome se não achar número
    } catch (e) {
      return null;
    }
  }

  // Monitorar mudanças no chat ativo a cada 1 segundo
  setInterval(() => {
    notifyBridgeReady(); // Mantém o heartbeat da extensão ativo no sistema
    const currentChat = extractActiveChatPhone();
    if (currentChat && currentChat !== lastSelectedPhone) {
      lastSelectedPhone = currentChat;
      console.log("[Sankhya Bridge] Chat alterado:", currentChat);
      try {
        window.parent.postMessage(
          {
            type: "SANKHYA_CHAT_CHANGED",
            phoneOrName: currentChat,
          },
          "*"
        );
      } catch (e) {}
    }
  }, 1200);

  // Inserir mensagem no campo de texto do WhatsApp Web e enviar
  function sendMessageToActiveChat(text) {
    try {
      // Procura a div editável do input do WhatsApp Web
      const messageInput = document.querySelector(
        "#main footer div[contenteditable='true']"
      );

      if (!messageInput) {
        alert("Aviso: Abra uma conversa no WhatsApp para enviar a mensagem.");
        return false;
      }

      messageInput.focus();

      // Inserir texto via document.execCommand para manter formatação nativa do React/WhatsApp
      document.execCommand("insertText", false, text);

      // Disparar evento de input
      messageInput.dispatchEvent(new Event("input", { bubbles: true }));

      // Aguardar brevemente e clicar no botão de enviar
      setTimeout(() => {
        const sendBtn = document.querySelector(
          "#main footer button[aria-label*='Enviar']"
        ) || document.querySelector("#main footer span[data-icon='send']");

        if (sendBtn) {
          sendBtn.click();
        }
      }, 300);

      return true;
    } catch (e) {
      console.error("[Sankhya Bridge] Erro ao enviar mensagem:", e);
      return false;
    }
  }

  // Escutar requisições vindas do Next.js
  window.addEventListener("message", (event) => {
    if (!event.data || typeof event.data !== "object") return;

    if (event.data.type === "SANKHYA_SEND_TEXT") {
      const { text } = event.data;
      if (text) {
        sendMessageToActiveChat(text);
      }
    } else if (event.data.type === "SANKHYA_REQUEST_CURRENT_CHAT") {
      const phone = extractActiveChatPhone();
      try {
        window.parent.postMessage(
          { type: "SANKHYA_CURRENT_CHAT_RESPONSE", phoneOrName: phone },
          "*"
        );
      } catch (e) {}
    }
  });

  // Notificar assim que carregar
  setTimeout(notifyBridgeReady, 1000);
})();
