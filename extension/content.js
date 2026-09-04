(function () {
  const isWhatsApp = window.location.hostname.includes("whatsapp.com");
  if (!isWhatsApp) {
    return; // Abortar imediatamente fora do WhatsApp Web para evitar qualquer interferência em inputs do sistema
  }

  console.log(`[WhatsApp Skill Engine] Script ativo no WhatsApp Web: ${window.location.href}`);

    let lastChatPhone = "";
    let lastName = "";

    function notifyReady() {
      try {
        window.top.postMessage({ type: "WHATSAPP_EVENT", event: "whatsapp_ready", timestamp: Date.now() }, "*");
      } catch (e) {}
      try {
        window.parent.postMessage({ type: "WHATSAPP_EVENT", event: "whatsapp_ready", timestamp: Date.now() }, "*");
      } catch (e) {}
    }

    function checkAndNotifyChat(force = false) {
      if (!window.WhatsAppDOM) return;
      const current = window.WhatsAppDOM.getActiveChatInfo();
      const currentPhone = current.phone || "";
      const currentName = current.name || "";

      // Se mudou de conversa pelo nome, atualiza o nome e permite nova extração do telefone
      if (currentName && currentName !== lastName) {
        lastName = currentName;
        if (!currentPhone) {
          lastChatPhone = "";
        }
      }

      // Só dispara se houver um NOVO telefone de contato REAL detectado (mínimo 8 dígitos)
      if (currentPhone && currentPhone.length >= 8) {
        const lastDigits = (lastChatPhone || "").replace(/\D/g, "").slice(-8);
        const currentDigits = currentPhone.replace(/\D/g, "").slice(-8);

        // Se não for forçado e for o mesmo contato já notificado (mesmos 8 dígitos finais), ignora
        if (!force && lastDigits && currentDigits && lastDigits === currentDigits) {
          return;
        }

        lastChatPhone = currentPhone;
        lastName = currentName;

        const evtPayload = {
          type: "WHATSAPP_EVENT",
          event: "chat_changed",
          timestamp: Date.now(),
          data: {
            phoneOrName: currentPhone,
            phone: currentPhone,
            name: currentName || "",
            hasPhone: true,
          },
        };
        console.log("[WhatsApp Skill] Disparando evento chat_changed com telefone do contato:", evtPayload.data);
        try {
          window.top.postMessage(evtPayload, "*");
          window.parent.postMessage(evtPayload, "*");
        } catch (e) {}
      }
    }

    // Escuta cliques do usuário na lista de chats ou no cabeçalho do contato para extração imediata
    document.addEventListener("click", (e) => {
      // Se o clique for no botão de fechar a gaveta (X ou Fechar), não dispara verificação
      const target = e.target;
      if (
        target &&
        (target.closest("button[aria-label*='Fechar' i]") ||
         target.closest("button[aria-label*='Close' i]") ||
         target.closest("div[role='button'][aria-label*='Fechar' i]") ||
         target.closest("div[role='button'][aria-label*='Close' i]") ||
         target.closest("[data-icon='x']") ||
         target.closest("[data-icon='x-alt']") ||
         target.closest("[data-icon='close']") ||
         target.closest("[data-testid='btn-closer']") ||
         target.closest("[data-testid='x']"))
      ) {
        return;
      }

      setTimeout(() => checkAndNotifyChat(true), 150);
      setTimeout(() => checkAndNotifyChat(true), 500);
      setTimeout(() => checkAndNotifyChat(true), 1000);
      setTimeout(() => checkAndNotifyChat(true), 1800);
    }, true);

    // Apenas Heartbeat a cada 2000ms para indicar que a extensão está conectada
    setInterval(() => {
      notifyReady();
    }, 2000);

    // Manipulador central de comandos semânticos
    async function handleCommand(command) {
      const { requestId, action, payload } = command;
      console.log("[WhatsApp Skill] Comando recebido no iframe:", action, payload);

      try {
        let data = {};
        switch (action) {
          case "status":
            data = await window.WhatsAppController.status();
            break;
          case "get_current_chat":
            data = await window.WhatsAppController.getCurrentChat();
            break;
          case "find_contact":
            data = await window.WhatsAppController.findContact(payload?.contact || payload?.phone || payload);
            break;
          case "open_chat":
            data = await window.WhatsAppController.openChat(payload);
            break;
          case "type_message":
            data = await window.WhatsAppController.typeMessage(payload);
            break;
          case "send_message":
          case "SANKHYA_SEND_TEXT":
            data = await window.WhatsAppController.sendMessage(payload || { message: command.text });
            break;
          default:
            throw new Error(`INVALID_COMMAND: Ação '${action}' não é suportada pela Skill.`);
        }

        return {
          type: "WHATSAPP_RESPONSE",
          requestId,
          success: true,
          data,
        };
      } catch (err) {
        console.error("[WhatsApp Skill] Erro ao executar comando:", err);
        return {
          type: "WHATSAPP_RESPONSE",
          requestId,
          success: false,
          error: {
            code: err.message?.startsWith("TIMEOUT") ? "TIMEOUT" : "COMMAND_FAILED",
            message: err.message || "Falha na execução do comando.",
          },
        };
      }
    }

    // Escutar postMessage do Next.js (parent frame ou iframe)
    window.addEventListener("message", async (event) => {
      if (!event.data || typeof event.data !== "object") return;

      // Suporte ao protocolo semântico WHATSAPP_COMMAND
      if (event.data.type === "WHATSAPP_COMMAND") {
        const response = await handleCommand(event.data);
        try {
          window.top.postMessage(response, "*");
        } catch (e) {}
        try {
          window.parent.postMessage(response, "*");
        } catch (e) {}
        try {
          event.source?.postMessage(response, "*");
        } catch (e) {}
      } 
      // Compatibilidade com eventos legados da ponte Sankhya
      else if (event.data.type === "SANKHYA_SEND_TEXT") {
        await handleCommand({ requestId: "legacy", action: "send_message", payload: { message: event.data.text } });
      } else if (event.data.type === "SANKHYA_OPEN_CHAT") {
        await handleCommand({ requestId: "legacy", action: "open_chat", payload: { phone: event.data.phone, message: event.data.text } });
      }
    });

    setTimeout(notifyReady, 500);
  }
})();
