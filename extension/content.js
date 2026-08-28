(function () {
  const isHostPage = window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1");
  const isWhatsApp = window.location.hostname.includes("whatsapp.com");

  console.log(`[WhatsApp Skill Engine] Script injetado em: ${window.location.href} (isHost: ${isHostPage}, isWhatsApp: ${isWhatsApp})`);

  // ========================================================
  // 1. COMPORTAMENTO NA PÁGINA PRINCIPAL (Next.js / Localhost)
  // ========================================================
  if (isHostPage) {
    function notifyHostReady() {
      try {
        window.postMessage({ type: "WHATSAPP_EVENT", event: "whatsapp_ready", timestamp: Date.now() }, "*");
      } catch (e) {}
    }

    notifyHostReady();
    setInterval(notifyHostReady, 2000);

    // Escuta comandos na página principal e repassa para todos os iframes da tela
    window.addEventListener("message", (event) => {
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.type === "WHATSAPP_COMMAND") {
        const iframes = document.querySelectorAll("iframe");
        iframes.forEach((ifr) => {
          try {
            ifr.contentWindow?.postMessage(event.data, "*");
          } catch (e) {}
        });
      }
    });
    return;
  }

  // ========================================================
  // 2. COMPORTAMENTO NO WHATSAPP WEB (Dentro do Iframe)
  // ========================================================
  if (isWhatsApp) {
    let lastChat = "";

    function notifyReady() {
      try {
        window.top.postMessage({ type: "WHATSAPP_EVENT", event: "whatsapp_ready", timestamp: Date.now() }, "*");
      } catch (e) {}
      try {
        window.parent.postMessage({ type: "WHATSAPP_EVENT", event: "whatsapp_ready", timestamp: Date.now() }, "*");
      } catch (e) {}
    }

    // Heartbeat e monitor de troca de chat
    setInterval(() => {
      notifyReady();
      if (window.WhatsAppDOM) {
        const current = window.WhatsAppDOM.getActiveChatInfo();
        const identifier = current.phone || current.name;
        if (identifier && identifier !== lastChat) {
          lastChat = identifier;
          try {
            const evtPayload = {
              type: "WHATSAPP_EVENT",
              event: "chat_changed",
              timestamp: Date.now(),
              data: { phoneOrName: identifier, name: current.name, phone: current.phone },
            };
            window.top.postMessage(evtPayload, "*");
            window.parent.postMessage(evtPayload, "*");
          } catch (e) {}
        }
      }
    }, 1200);

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
