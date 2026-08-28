// Content script injetado em https://web.whatsapp.com/* (Top frame e Sub frames)
// Comunicação bidirecional e Motor Unificado de Envio do WhatsApp Web

(function () {
  console.log("[Sankhya Bridge] Content script carregado no WhatsApp Web (Frame: " + (window.self === window.top ? "TOP" : "SUBFRAME") + ").");

  let lastSelectedPhone = "";

  // 1. Notificar a janela pai que a extensão Sankhya está ativa
  function notifyBridgeReady() {
    try {
      window.parent.postMessage({ type: "SANKHYA_BRIDGE_READY" }, "*");
      window.postMessage({ type: "SANKHYA_BRIDGE_READY" }, "*");
    } catch (e) {}
  }

  // 2. Extrai o telefone ou nome do contato selecionado no WhatsApp Web
  function extractActiveChatPhone() {
    try {
      const headerTitle = document.querySelector("#main header span[title]");
      if (!headerTitle) return null;

      const titleText = headerTitle.getAttribute("title") || headerTitle.innerText || "";
      
      const digitsOnly = titleText.replace(/\D/g, "");
      if (digitsOnly.length >= 8) {
        return digitsOnly;
      }

      const profileImg = document.querySelector("#main header img[src*='whatsapp.net']");
      if (profileImg) {
        const src = profileImg.getAttribute("src") || "";
        const match = src.match(/\/u\/(\d+)/) || src.match(/(\d+)@/);
        if (match && match[1]) {
          return match[1];
        }
      }

      return titleText;
    } catch (e) {
      return null;
    }
  }

  // 3. Simula sequência completa de eventos do mouse/touch humano em um elemento
  function simulateHumanClick(element) {
    if (!element) return;
    try {
      const rect = element.getBoundingClientRect();
      const clientX = rect.left + Math.max(1, rect.width / 2);
      const clientY = rect.top + Math.max(1, rect.height / 2);
      const opts = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX,
        clientY,
        buttons: 1,
      };

      element.dispatchEvent(new PointerEvent("pointerover", opts));
      element.dispatchEvent(new MouseEvent("mouseover", opts));
      element.dispatchEvent(new PointerEvent("pointerenter", opts));
      element.dispatchEvent(new MouseEvent("mouseenter", opts));
      element.dispatchEvent(new PointerEvent("pointerdown", opts));
      element.dispatchEvent(new MouseEvent("mousedown", opts));
      element.focus();
      element.dispatchEvent(new PointerEvent("pointerup", opts));
      element.dispatchEvent(new MouseEvent("mouseup", opts));
      element.dispatchEvent(new MouseEvent("click", opts));
    } catch (err) {
      element.click();
    }
  }

  // 4. Simula digitação humana nativa (compatível com Lexical, React 18 e DraftJS)
  function simulateHumanTyping(element, text) {
    if (!element) return;
    try {
      simulateHumanClick(element);

      // Posiciona seleção
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);

      // Inserção via ClipboardEvent (Paste) para o Lexical
      try {
        const dataTransfer = new DataTransfer();
        dataTransfer.setData("text/plain", text);
        const pasteEvent = new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: dataTransfer,
        });
        element.dispatchEvent(pasteEvent);
      } catch (e) {}

      // Fallback nativo: execCommand com beforeinput e input
      if (!element.innerText || !element.innerText.includes(text.slice(0, 5))) {
        element.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "insertText", data: text }));
        document.execCommand("insertText", false, text);
        element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
      }

      element.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (e) {
      console.error("[Sankhya Bridge] Erro ao simular digitação:", e);
    }
  }

  // 5. Localiza a caixa de mensagem do WhatsApp Web
  function findMessageInput() {
    return (
      document.querySelector("#main footer div[contenteditable='true']") ||
      document.querySelector("#main footer div[data-lexical-editor='true']") ||
      document.querySelector("#main footer div[role='textbox']") ||
      document.querySelector("#main footer div.lexical-rich-text-input") ||
      document.querySelector("footer div[contenteditable='true']") ||
      document.querySelector("footer div[role='textbox']") ||
      document.querySelector("footer div[data-lexical-editor='true']") ||
      document.querySelector("#main footer p.selectable-text")
    );
  }

  // 6. Motor Unificado de Envio: Aguarda o chat estar pronto e dispara a mensagem
  function waitForActiveChatAndSend(text, maxAttempts = 20) {
    console.log("[Sankhya Bridge] Motor Unificado: Aguardando campo de mensagem...");
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const messageInput = findMessageInput();

      if (messageInput) {
        clearInterval(interval);
        console.log("[Sankhya Bridge] Campo pronto! Injetando mensagem...");

        setTimeout(() => {
          simulateHumanTyping(messageInput, text);

          setTimeout(() => {
            const sendBtn =
              document.querySelector("#main footer button[aria-label*='Enviar']") ||
              document.querySelector("#main footer button[aria-label*='Send']") ||
              document.querySelector("#main footer span[data-icon='send']") ||
              document.querySelector("#main footer span[data-icon='wds-ic-send-filled']") ||
              document.querySelector("#main footer button:has(span[data-icon*='send'])");

            if (sendBtn) {
              simulateHumanClick(sendBtn);
              console.log("[Sankhya Bridge] Mensagem enviada com sucesso via botão Enviar!");
            } else {
              const enterEvent = new KeyboardEvent("keydown", {
                key: "Enter",
                code: "Enter",
                keyCode: 13,
                which: 13,
                bubbles: true,
              });
              messageInput.dispatchEvent(enterEvent);
              console.log("[Sankhya Bridge] Mensagem enviada via tecla Enter!");
            }
          }, 350);
        }, 150);

        return;
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.warn("[Sankhya Bridge] Tempo esgotado aguardando o campo de mensagem.");
      }
    }, 250);
  }

  // 7. Busca um contato na lista de resultados IGNORANDO explicitamente Arquivadas
  function findContactSearchResult(phoneDigits) {
    const cleanDigits = phoneDigits.replace(/\D/g, "");
    const shortDigits = cleanDigits.length > 8 ? cleanDigits.slice(-8) : cleanDigits;

    // 1. Procurar elementos que contenham os dígitos do telefone no título
    const matchingTitle = document.querySelector(
      `#pane-side span[title*='${shortDigits}'], div[aria-label*='Resultados'] span[title*='${shortDigits}'], div[aria-label*='Results'] span[title*='${shortDigits}']`
    );
    if (matchingTitle) {
      const container =
        matchingTitle.closest("div[role='listitem']") ||
        matchingTitle.closest("div[data-testid='cell-frame-container']") ||
        matchingTitle.closest("div[tabindex='-1']") ||
        matchingTitle;
      return container;
    }

    // 2. Procurar itens que contenham o telefone ou botão 'Conversar com...' e IGNORAR 'Arquivadas'
    const items = document.querySelectorAll(
      "#pane-side div[role='listitem'], div[aria-label*='Resultados'] div[role='listitem'], #pane-side div[data-testid='cell-frame-container']"
    );

    for (const item of items) {
      const text = item.innerText || "";
      const textLower = text.toLowerCase();

      // Ignora expressamente qualquer elemento de Arquivadas
      if (
        textLower.includes("arquivada") ||
        textLower.includes("archived") ||
        item.querySelector("span[data-icon*='archive']") ||
        item.querySelector("button[aria-label*='Arquivada']")
      ) {
        continue;
      }

      // Se encontrar dígitos do contato ou texto de conversa
      if (
        text.replace(/\D/g, "").includes(shortDigits) ||
        textLower.includes("conversar com") ||
        textLower.includes("chat with")
      ) {
        return item;
      }
    }

    return null;
  }

  // 8. Abre qualquer telefone via busca nativa com disparo de Enter e Fallback SPA
  function openChatWithoutReload(phone, text) {
    try {
      const cleanPhone = phone.replace(/\D/g, "");
      const fullPhone = cleanPhone.length <= 11 ? "55" + cleanPhone : cleanPhone;
      const shortDigits = cleanPhone.length > 8 ? cleanPhone.slice(-8) : cleanPhone;

      console.log("[Sankhya Bridge] Buscando conversa para:", fullPhone);

      // Localiza a caixa de busca principal da barra lateral
      const searchBox =
        document.querySelector("#side div[contenteditable='true']") ||
        document.querySelector("div[data-tab='3']") ||
        document.querySelector("#side div[role='textbox']") ||
        document.querySelector("#side input[type='text']") ||
        document.querySelector("div[aria-label*='Pesquisar']");

      if (searchBox) {
        simulateHumanClick(searchBox);

        // Limpa busca anterior e digita o telefone
        document.execCommand("selectAll", false, null);
        document.execCommand("insertText", false, fullPhone);
        searchBox.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: fullPhone }));
        searchBox.dispatchEvent(new Event("change", { bubbles: true }));

        // Dispara Enter na busca para abrir o primeiro resultado correspondente
        setTimeout(() => {
          const enterEvent = new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
          });
          searchBox.dispatchEvent(enterEvent);
        }, 150);

        // Monitora a lista para clicar no contato correspondente
        let searchAttempts = 0;
        const searchInterval = setInterval(() => {
          searchAttempts++;

          const contactItem = findContactSearchResult(fullPhone);

          if (contactItem) {
            clearInterval(searchInterval);
            simulateHumanClick(contactItem);
            console.log("[Sankhya Bridge] Contato aberto na lista com sucesso!");

            if (text) {
              waitForActiveChatAndSend(text);
            }
            return;
          }

          // Se após 1.5s não abriu pela busca lateral, aciona o deep link SPA interno
          if (searchAttempts >= 6) {
            clearInterval(searchInterval);
            console.log("[Sankhya Bridge] Abrindo via deep link SPA para:", fullPhone);
            const a = document.createElement("a");
            a.href = `https://web.whatsapp.com/send?phone=${fullPhone}${text ? `&text=${encodeURIComponent(text)}` : ""}`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => a.remove(), 400);

            if (text) {
              waitForActiveChatAndSend(text);
            }
          }
        }, 250);
      } else {
        // Fallback SPA
        const a = document.createElement("a");
        a.href = `https://web.whatsapp.com/send?phone=${fullPhone}${text ? `&text=${encodeURIComponent(text)}` : ""}`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => a.remove(), 400);

        if (text) {
          waitForActiveChatAndSend(text);
        }
      }

      return true;
    } catch (e) {
      console.error("[Sankhya Bridge] Erro ao abrir conversa:", e);
      return false;
    }
  }

  // 9. Auto-enviar quando a página for aberta via URL send?phone=...
  function checkAutoSendUrl() {
    if (window.location.href.includes("send?phone=") || window.location.href.includes("send/?phone=")) {
      console.log("[Sankhya Bridge] Deep link send?phone ativo. Aguardando chat renderizar...");
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const messageInput = findMessageInput();

        const sendBtn =
          document.querySelector("#main footer button[aria-label*='Enviar']") ||
          document.querySelector("#main footer button[aria-label*='Send']") ||
          document.querySelector("#main footer span[data-icon='send']") ||
          document.querySelector("#main footer span[data-icon='wds-ic-send-filled']") ||
          document.querySelector("#main footer button:has(span[data-icon*='send'])");

        if (sendBtn) {
          clearInterval(interval);
          setTimeout(() => {
            simulateHumanClick(sendBtn);
            console.log("[Sankhya Bridge] Envio automático concluído no deep link!");
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
          console.log("[Sankhya Bridge] Envio automático via Enter concluído!");
        }

        if (attempts >= 50) {
          clearInterval(interval);
        }
      }, 500);
    }
  }

  // 10. Heartbeat e monitor de conversa ativa
  setInterval(() => {
    notifyBridgeReady();
    const currentChat = extractActiveChatPhone();
    if (currentChat && currentChat !== lastSelectedPhone) {
      lastSelectedPhone = currentChat;
      console.log("[Sankhya Bridge] Chat ativo alterado:", currentChat);
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

  // 11. Ouvinte de mensagens vindas da aplicação Sankhya (Motor Unificado)
  window.addEventListener("message", (event) => {
    if (!event.data || typeof event.data !== "object") return;

    if (event.data.type === "SANKHYA_SEND_TEXT") {
      const { text } = event.data;
      if (text) {
        waitForActiveChatAndSend(text);
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

  // Inicialização
  setTimeout(() => {
    notifyBridgeReady();
    checkAutoSendUrl();
  }, 500);
})();
