(function () {
  window.WhatsAppDOM = {
    // 1. Digitação especializada para a Barra de Pesquisa (#side)
    typeSearch: function (element, text) {
      if (!element) return false;

      element.focus();

      // Limpar campo de pesquisa
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand("delete", false, null);
      } catch (e) {}

      // Inserir texto nativamente
      let inserted = false;
      try {
        inserted = document.execCommand("insertText", false, text);
      } catch (e) {}

      if (!inserted || !element.textContent?.trim()) {
        try {
          element.textContent = text;
        } catch (e) {}
      }

      // Disparar eventos de input que acionam a busca do WhatsApp
      try {
        element.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "insertText", data: text }));
        element.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText", data: text }));
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
      } catch (e) {}

      return true;
    },

    // 2. Simulação Humana de Digitação/Colagem para o Editor Lexical (React 18 no #main)
    simulateHumanTyping: function (element, text) {
      if (!element) return false;

      element.focus();

      // Posicionar cursor e limpar seleção
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (e) {}

      // Passo A: Colagem via ClipboardEvent com DataTransfer real (Aceito nativamente pelo Lexical)
      let pasteSuccess = false;
      try {
        const dataTransfer = new DataTransfer();
        dataTransfer.setData("text/plain", text);
        const pasteEvt = new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: dataTransfer,
        });
        pasteSuccess = element.dispatchEvent(pasteEvt);
      } catch (e) {}

      // Fallback: execCommand insertText
      if (!pasteSuccess || !element.textContent?.trim()) {
        try {
          document.execCommand("insertText", false, text);
        } catch (e) {}
      }

      // Disparar eventos de entrada que o Lexical e o React escutam para atualizar o estado
      try {
        element.dispatchEvent(new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: text,
        }));
        element.dispatchEvent(new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: text,
        }));
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
      } catch (e) {}

      return true;
    },

    // Alias para compatibilidade
    typeText: function (element, text) {
      return this.simulateHumanTyping(element, text);
    },

    // 3. Simulação Humana de Clique Físico com Coordenadas Reais de Tela (React 18)
    simulateHumanClick: function (element) {
      if (!element) return false;

      const rect = element.getBoundingClientRect();
      const clientX = rect.left + rect.width / 2;
      const clientY = rect.top + rect.height / 2;

      const mouseOpts = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX,
        clientY,
        screenX: clientX,
        screenY: clientY,
        button: 0,
        buttons: 1,
      };

      const pointerOpts = {
        ...mouseOpts,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        width: 1,
        height: 1,
        pressure: 0.5,
      };

      // Cadeia física: pointerover ⟶ mouseover ⟶ pointerdown ⟶ mousedown ⟶ focus ⟶ pointerup ⟶ mouseup ⟶ click
      try {
        element.dispatchEvent(new PointerEvent("pointerover", pointerOpts));
        element.dispatchEvent(new MouseEvent("mouseover", mouseOpts));
        element.dispatchEvent(new PointerEvent("pointerdown", pointerOpts));
        element.dispatchEvent(new MouseEvent("mousedown", mouseOpts));
        element.focus();
        element.dispatchEvent(new PointerEvent("pointerup", pointerOpts));
        element.dispatchEvent(new MouseEvent("mouseup", mouseOpts));
        element.dispatchEvent(new MouseEvent("click", mouseOpts));
        element.click();
        console.log("[WhatsApp Skill] simulateHumanClick executado com sucesso nas coordenadas:", clientX, clientY);
        return true;
      } catch (e) {
        console.warn("[WhatsApp Skill] Erro em simulateHumanClick:", e);
        try {
          element.click();
          return true;
        } catch (err) {
          return false;
        }
      }
    },

    // 4. Executa o clique de envio físico ou tecla Enter
    clickSendOrPressEnter: function (messageInput) {
      // 1. Procurar botão de enviar no DOM
      const sendBtnSelectors = window.WhatsAppSelectors.sendButton;
      for (const sel of sendBtnSelectors) {
        const btn = document.querySelector(sel);
        if (btn) {
          const target = btn.closest("button") || btn;
          const clicked = this.simulateHumanClick(target);
          if (clicked) {
            console.log("[WhatsApp Skill] Botão de enviar acionado via simulateHumanClick:", sel);
            return true;
          }
        }
      }

      // 2. Disparar eventos da tecla Enter no input como garantia
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

    // 5. Extrai o telefone/nome da conversa ativa
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
