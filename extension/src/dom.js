(function () {
  window.WhatsAppDOM = {
    // Digita ou injeta texto no elemento contenteditable com disparo de eventos React
    typeText: function (element, text) {
      if (!element) return false;

      element.focus();

      // Limpar seleção anterior e focar
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (e) {}

      let success = false;

      // Método 1: execCommand insertText (Método nativo do Chrome para ContentEditable)
      try {
        success = document.execCommand("insertText", false, text);
      } catch (e) {}

      // Método 2: Simular Evento de Colar (Clipboard paste)
      if (!success || !element.textContent?.trim()) {
        try {
          const dt = new DataTransfer();
          dt.setData("text/plain", text);
          const pasteEvt = new ClipboardEvent("paste", {
            clipboardData: dt,
            bubbles: true,
            cancelable: true,
          });
          success = element.dispatchEvent(pasteEvt);
        } catch (e) {}
      }

      // Método 3: Atribuição direta por TextNode
      if (!element.textContent?.trim()) {
        try {
          element.innerHTML = "";
          const textNode = document.createTextNode(text);
          element.appendChild(textNode);
        } catch (e) {}
      }

      // Disparar eventos de entrada do React
      try {
        element.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "insertText", data: text }));
        element.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText", data: text }));
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
      } catch (e) {}

      return true;
    },

    // Executa o clique de envio ou envia tecla Enter
    clickSendOrPressEnter: function (messageInput) {
      // 1. Procurar botão de enviar no DOM
      const sendBtnSelectors = window.WhatsAppSelectors.sendButton;
      for (const sel of sendBtnSelectors) {
        const btn = document.querySelector(sel);
        if (btn) {
          const target = btn.closest("button") || btn;
          target.click();
          console.log("[WhatsApp Skill] Botão de enviar clicado com sucesso:", sel);
          return true;
        }
      }

      // 2. Disparar eventos da tecla Enter
      if (messageInput) {
        messageInput.focus();
        try {
          const opts = { key: "Enter", code: "Enter", keyCode: 13, which: 13, charCode: 13, bubbles: true, cancelable: true };
          messageInput.dispatchEvent(new KeyboardEvent("keydown", opts));
          messageInput.dispatchEvent(new KeyboardEvent("keypress", opts));
          messageInput.dispatchEvent(new KeyboardEvent("keyup", opts));
          console.log("[WhatsApp Skill] Eventos de Enter disparados no input.");
          return true;
        } catch (e) {}
      }

      return false;
    },

    // Extrai o telefone/nome da conversa ativa
    getActiveChatInfo: function () {
      try {
        const titleSelectors = window.WhatsAppSelectors.activeChatHeaderTitle;
        let titleText = "";
        for (const sel of titleSelectors) {
          const el = document.querySelector(sel);
          if (el) {
            titleText = el.getAttribute("title") || el.innerText || "";
            if (titleText) break;
          }
        }

        const digitsOnly = titleText.replace(/\D/g, "");
        const phone = digitsOnly.length >= 8 ? digitsOnly : null;

        return {
          name: titleText,
          phone: phone,
          isPhone: !!phone,
        };
      } catch (e) {
        return { name: "", phone: null, isPhone: false };
      }
    },
  };
})();
