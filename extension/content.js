// Content script injetado em https://web.whatsapp.com/* (Top frame e Sub frames)
// Comunicação com o sistema Financeiro Sankhya (parent frame ou web app)

(function () {
  console.log("[Sankhya Bridge] Content script carregado no WhatsApp Web (Frame: " + (window.self === window.top ? "TOP" : "SUBFRAME") + ").");

  let lastSelectedPhone = "";

  // Notificar a janela pai que a extensão Sankhya está pronta
  function notifyBridgeReady() {
    try {
      window.parent.postMessage({ type: "SANKHYA_BRIDGE_READY" }, "*");
      window.postMessage({ type: "SANKHYA_BRIDGE_READY" }, "*");
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

  // Abrir conversa diretamente no WhatsApp Web sem recarregar o iframe
  function openChatWithoutReload(phone, text) {
    try {
      const cleanPhone = phone.replace(/\D/g, "");
      const fullPhone = cleanPhone.length <= 11 ? "55" + cleanPhone : cleanPhone;
      const shortPhone = cleanPhone.length > 8 ? cleanPhone.slice(-8) : cleanPhone;

      console.log("[Sankhya Bridge] Abrindo conversa para:", fullPhone);

      // 1. Tentar clicar no botão de 'Nova conversa' para abrir a busca direta de contatos
      const newChatBtn =
        document.querySelector("button[aria-label*='Nova conversa']") ||
        document.querySelector("button[aria-label*='New chat']") ||
        document.querySelector("span[data-icon='chat']") ||
        document.querySelector("span[data-icon='new-chat-outline']") ||
        document.querySelector("span[data-icon='plus']");

      if (newChatBtn) {
        newChatBtn.click();
      }

      // 2. Localiza a caixa de busca de contatos/conversas
      setTimeout(() => {
        const searchBox =
          document.querySelector("#side div[contenteditable='true']") ||
          document.querySelector("div[data-tab='3']") ||
          document.querySelector("div[role='textbox']") ||
          document.querySelector("#side input");

        if (searchBox) {
          searchBox.focus();

          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(searchBox);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);

          // Insere o número na busca
          document.execCommand("selectAll", false, null);
          document.execCommand("insertText", false, fullPhone);

          searchBox.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, inputType: "insertText", data: fullPhone }));
          searchBox.dispatchEvent(new Event("input", { bubbles: true }));
          searchBox.dispatchEvent(new Event("change", { bubbles: true }));

          // Aguarda os resultados da busca aparecerem na lista
          let searchAttempts = 0;
          const searchInterval = setInterval(() => {
            searchAttempts++;

            const contactItem =
              document.querySelector("#pane-side div[role='listitem']") ||
              document.querySelector("#pane-side div[data-testid='cell-frame-container']") ||
              document.querySelector("#pane-side span[title*='" + shortPhone + "']") ||
              document.querySelector("#pane-side div[aria-label*='Conversas'] div[tabindex='-1']") ||
              document.querySelector("div[aria-label*='Resultados'] div[role='listitem']") ||
              document.querySelector("#pane-side div[tabindex='0']");

            if (contactItem) {
              clearInterval(searchInterval);
              contactItem.click();
              console.log("[Sankhya Bridge] Chat aberto com sucesso via busca nativa!");

              if (text) {
                setTimeout(() => {
                  sendMessageToActiveChat(text);
                }, 400);
              }
            }

            if (searchAttempts >= 12) {
              clearInterval(searchInterval);
              // Fallback: âncora virtual SPA
              const a = document.createElement("a");
              a.href = `https://web.whatsapp.com/send?phone=${fullPhone}${text ? `&text=${encodeURIComponent(text)}` : ""}`;
              a.style.display = "none";
              document.body.appendChild(a);
              a.click();
              setTimeout(() => a.remove(), 400);
            }
          }, 200);
        } else {
          // Fallback: âncora virtual SPA
          const a = document.createElement("a");
          a.href = `https://web.whatsapp.com/send?phone=${fullPhone}${text ? `&text=${encodeURIComponent(text)}` : ""}`;
          a.style.display = "none";
          document.body.appendChild(a);
          a.click();
          setTimeout(() => a.remove(), 400);
        }
      }, 150);

      return true;
    } catch (e) {
      console.error("[Sankhya Bridge] Erro ao abrir chat sem reload:", e);
      return false;
    }
  }

  // Auto-enviar quando a página for aberta através de deep link /send?phone=...&text=...
  function checkAutoSendUrl() {
    if (window.location.href.includes("send?phone=") || window.location.href.includes("send/?phone=")) {
      console.log("[Sankhya Bridge] Deep link send?phone detectado. Aguardando renderização do chat...");
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const messageInput =
          document.querySelector("#main footer div[contenteditable='true']") ||
          document.querySelector("#main footer div[role='textbox']") ||
          document.querySelector("footer div[contenteditable='true']");

        const sendBtn =
          document.querySelector("#main footer button[aria-label*='Enviar']") ||
          document.querySelector("#main footer button[aria-label*='Send']") ||
          document.querySelector("#main footer span[data-icon='send']") ||
          document.querySelector("#main footer span[data-icon='wds-ic-send-filled']") ||
          document.querySelector("#main footer button:has(span[data-icon*='send'])");

        if (sendBtn) {
          clearInterval(interval);
          setTimeout(() => {
            sendBtn.click();
            console.log("[Sankhya Bridge] Mensagem enviada automaticamente no deep link!");
          }, 600);
        } else if (messageInput && attempts >= 8 && messageInput.innerText.trim().length > 0) {
          clearInterval(interval);
          const enterEvent = new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
          });
          messageInput.dispatchEvent(enterEvent);
          console.log("[Sankhya Bridge] Mensagem enviada via tecla Enter no deep link.");
        }

        if (attempts >= 50) {
          clearInterval(interval);
        }
      }, 500);
    }
  }

  // Monitorar mudanças no chat ativo a cada 1 segundo
  setInterval(() => {
    notifyBridgeReady();
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
  }, 1000);

  // Inserir mensagem no campo de texto do WhatsApp Web e enviar
  function sendMessageToActiveChat(text) {
    try {
      const messageInput =
        document.querySelector("#main footer div[contenteditable='true']") ||
        document.querySelector("#main footer div[role='textbox']") ||
        document.querySelector("footer div[contenteditable='true']");

      if (!messageInput) {
        console.warn("[Sankhya Bridge] Campo de mensagem não encontrado. Tentando abrir chat...");
        if (lastSelectedPhone && lastSelectedPhone.replace(/\D/g, "").length >= 8) {
          openChatWithoutReload(lastSelectedPhone, text);
          return true;
        }
        alert("Aviso: Selecione um contato no WhatsApp ou digite o telefone acima para abrir a conversa.");
        return false;
      }

      messageInput.focus();

      // Ajusta o cursor para dentro do campo
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(messageInput);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);

      // Inserir texto nativamente
      document.execCommand("insertText", false, text);

      // Fallback caso execCommand falhe
      if (!messageInput.innerText || !messageInput.innerText.includes(text.slice(0, 10))) {
        messageInput.innerText = text;
      }

      // Disparar eventos de input para o React do WhatsApp
      messageInput.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, inputType: "insertText", data: text }));
      messageInput.dispatchEvent(new Event("input", { bubbles: true }));
      messageInput.dispatchEvent(new Event("change", { bubbles: true }));

      // Aguardar brevemente e disparar envio
      setTimeout(() => {
        const sendBtn =
          document.querySelector("#main footer button[aria-label*='Enviar']") ||
          document.querySelector("#main footer button[aria-label*='Send']") ||
          document.querySelector("#main footer span[data-icon='send']") ||
          document.querySelector("#main footer span[data-icon='wds-ic-send-filled']") ||
          document.querySelector("#main footer button:has(span[data-icon*='send'])");

        if (sendBtn) {
          sendBtn.click();
          console.log("[Sankhya Bridge] Mensagem enviada com sucesso!");
        } else {
          // Dispara tecla Enter caso o botão não esteja visível
          const enterEvent = new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
          });
          messageInput.dispatchEvent(enterEvent);
          console.log("[Sankhya Bridge] Mensagem enviada via Enter!");
        }
      }, 350);

      return true;
    } catch (e) {
      console.error("[Sankhya Bridge] Erro ao injetar mensagem:", e);
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
    } else if (event.data.type === "SANKHYA_NAVIGATE_PHONE") {
      const { phone, text } = event.data;
      if (phone) {
        openChatWithoutReload(phone, text);
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

  // Notificar assim que carregar e monitorar auto-send
  setTimeout(() => {
    notifyBridgeReady();
    checkAutoSendUrl();
  }, 500);
})();
