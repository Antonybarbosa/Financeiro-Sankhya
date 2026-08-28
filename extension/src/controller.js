(function () {
  window.WhatsAppController = {
    // 1. Verificar status da conexão
    status: async function () {
      const isLoaded = !!document.querySelector("#app");
      const isConnected = !!document.querySelector("#side") || !!document.querySelector("#main");
      return {
        connected: isConnected,
        loaded: isLoaded,
        url: window.location.href,
        title: document.title,
      };
    },

    // 2. Obter conversa atual
    getCurrentChat: async function () {
      const info = window.WhatsAppDOM.getActiveChatInfo();
      return {
        name: info.name,
        phone: info.phone,
      };
    },

    // 3. Localizar contato pela barra de pesquisa nativa do WhatsApp Web
    findContact: async function (target) {
      if (!target) throw new Error("Contato/Telefone não informado.");

      console.log("[WhatsApp Skill] Localizando campo de busca para:", target);

      // Tentar ativar a barra de pesquisa caso esteja em modo botão
      try {
        const searchBtn = document.querySelector("#side button[aria-label*='Pesquisar']") || 
                          document.querySelector("#side button[aria-label*='Search']") ||
                          document.querySelector("#side label");
        if (searchBtn) {
          searchBtn.click();
          await new Promise((r) => setTimeout(r, 200));
        }
      } catch (e) {}

      const searchInputRes = await window.WhatsAppWait.waitForElement(window.WhatsAppSelectors.searchInput, 4000);
      const searchInput = searchInputRes.element;

      searchInput.focus();

      // Limpar busca anterior
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(searchInput);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand("delete", false, null);
      } catch (e) {}

      // Digitar o número ou nome no campo de busca
      console.log("[WhatsApp Skill] Digitando busca:", target);
      window.WhatsAppDOM.typeText(searchInput, target);

      // Aguardar para o WhatsApp Web filtrar os resultados
      await new Promise((r) => setTimeout(r, 600));

      // Disparar Enter no campo de busca para selecionar o primeiro resultado
      try {
        searchInput.dispatchEvent(new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
        }));
      } catch (e) {}

      // Clicar no primeiro item da lista de resultados caso o Enter não abra direto
      try {
        await new Promise((r) => setTimeout(r, 300));
        const resultItemRes = await window.WhatsAppWait.waitForElement(window.WhatsAppSelectors.searchResultItem, 2500);
        if (resultItemRes && resultItemRes.element) {
          resultItemRes.element.click();
          console.log("[WhatsApp Skill] Clique no resultado de pesquisa efetuado com sucesso.");
        }
      } catch (e) {}

      // Aguardar a área de mensagem do chat carregar
      await window.WhatsAppWait.waitForElement(window.WhatsAppSelectors.messageInput, 4000);
      console.log("[WhatsApp Skill] Chat carregado via pesquisa!");
      return { found: true, target };
    },

    // 4. Abrir conversa por telefone ou nome (Pesquisa UI com fallback SPA)
    openChat: async function (payload) {
      const { contact, phone, message } = payload || {};
      const targetPhone = phone || (contact && String(contact).replace(/\D/g, "").length >= 8 ? contact : null);
      const target = targetPhone || contact;

      if (!target) {
        throw new Error("Telefone ou contato não informado.");
      }

      console.log("[WhatsApp Skill] Abrindo chat para:", target);

      let opened = false;

      // Estratégia 1: Buscar diretamente pela caixa de pesquisa nativa do WhatsApp Web
      try {
        await this.findContact(target);
        opened = true;
      } catch (errSearch) {
        console.warn("[WhatsApp Skill] Busca nativa falhou, tentando fallback SPA link:", errSearch.message);
      }

      // Estratégia 2: Fallback via Deep-Link SPA se a busca direta não concluiu
      if (!opened && targetPhone) {
        const digits = String(targetPhone).replace(/\D/g, "");
        const fullPhone = digits.length <= 11 && !digits.startsWith("55") ? "55" + digits : digits;

        let link = document.getElementById("sankhya-skill-link");
        if (!link) {
          link = document.createElement("a");
          link.id = "sankhya-skill-link";
          link.style.display = "none";
          document.body.appendChild(link);
        }
        const encodedText = message ? `&text=${encodeURIComponent(message)}` : "";
        link.href = `https://web.whatsapp.com/send?phone=${fullPhone}${encodedText}`;
        link.click();

        try {
          await window.WhatsAppWait.waitForElement(window.WhatsAppSelectors.messageInput, 4000);
          opened = true;
        } catch (e) {}
      }

      // Se uma mensagem foi informada, aguarda e envia
      if (message) {
        console.log("[WhatsApp Skill] Enviando mensagem programada após abertura do chat...");
        await this.sendMessage({ message });
      }

      return { opened: true, target };
    },

    // 5. Digitar mensagem
    typeMessage: async function (payload) {
      const { message } = payload || {};
      if (!message) throw new Error("Mensagem vazia.");

      const inputRes = await window.WhatsAppWait.waitForElement(window.WhatsAppSelectors.messageInput, 6000);
      const inputEl = inputRes.element;

      window.WhatsAppDOM.typeText(inputEl, message);
      return { typed: true, length: message.length };
    },

    // 6. Enviar mensagem (Digitar + Clicar em Enviar)
    sendMessage: async function (payload) {
      const { message } = payload || {};
      if (!message) throw new Error("Mensagem não informada.");

      console.log("[WhatsApp Skill] Aguardando campo de mensagem do chat ativo...");
      const inputRes = await window.WhatsAppWait.waitForElement(window.WhatsAppSelectors.messageInput, 6000);
      const inputEl = inputRes.element;

      console.log("[WhatsApp Skill] Injetando texto da mensagem...");
      window.WhatsAppDOM.typeText(inputEl, message);

      // Aguardar brevemente a UI do WhatsApp Web renderizar o botão de envio
      await new Promise((r) => setTimeout(r, 350));

      // Tentativas de envio
      let sent = window.WhatsAppDOM.clickSendOrPressEnter(inputEl);
      if (!sent) {
        await new Promise((r) => setTimeout(r, 350));
        sent = window.WhatsAppDOM.clickSendOrPressEnter(inputEl);
      }

      if (!sent) {
        throw new Error("SEND_BUTTON_NOT_FOUND: Não foi possível clicar no botão de envio nem disparar o Enter.");
      }

      console.log("[WhatsApp Skill] Mensagem enviada com sucesso!");
      return { sent: true, message };
    },
  };
})();
