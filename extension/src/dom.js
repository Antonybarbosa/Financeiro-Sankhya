(function () {
  // Inicializador da Store interna do WhatsApp Web via Webpack Chunks
  function initWhatsAppStore() {
    if (window.WhatsAppStore && window.WhatsAppStore.Chat) return;

    try {
      if (typeof window.webpackChunkwhatsapp_web_client === "undefined") return;

      let webpackRequire = null;
      window.webpackChunkwhatsapp_web_client.push([
        ["sankhya_extractor_" + Math.random().toString(36).substring(7)],
        {},
        (req) => {
          webpackRequire = req;
        },
      ]);

      if (!webpackRequire || !webpackRequire.c) return;

      window.WhatsAppStore = window.WhatsAppStore || {};

      for (const id in webpackRequire.c) {
        const mod = webpackRequire.c[id]?.exports;
        if (!mod) continue;

        if (!window.WhatsAppStore.Chat) {
          if (mod.ChatCollection || mod.default?.ChatCollection) {
            window.WhatsAppStore.Chat = mod.ChatCollection || mod.default?.ChatCollection;
          } else if (mod.getActiveChat || (mod.getChat && mod.getActive)) {
            window.WhatsAppStore.Chat = mod;
          }
        }

        if (!window.WhatsAppStore.Contact) {
          if (mod.ContactCollection || mod.default?.ContactCollection) {
            window.WhatsAppStore.Contact = mod.ContactCollection || mod.default?.ContactCollection;
          }
        }

        if (!window.WhatsAppStore.getActiveChat) {
          if (typeof mod.getActiveChat === "function") {
            window.WhatsAppStore.getActiveChat = mod.getActiveChat;
          } else if (typeof mod.default?.getActiveChat === "function") {
            window.WhatsAppStore.getActiveChat = mod.default.getActiveChat;
          }
        }
      }
    } catch (e) {}
  }

  initWhatsAppStore();
  setInterval(initWhatsAppStore, 2000);

  window.WhatsAppDOM = {
    // 1. Digitação especializada para a Barra de Pesquisa (#side)
    typeSearch: function (element, text) {
      if (!element) return false;

      element.focus();

      // Suporte direto para <input> ou <textarea>
      if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
        try {
          element.value = "";
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          )?.set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(element, text);
          } else {
            element.value = text;
          }
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        } catch (e) {}
      }

      // Suporte para contenteditable
      const targetNode = element.querySelector("p") || element.querySelector("[contenteditable='true']") || element;
      targetNode.focus();

      // Limpar campo de pesquisa
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(targetNode);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand("delete", false, null);
      } catch (e) {}

      // Inserir texto nativamente
      let inserted = false;
      try {
        inserted = document.execCommand("insertText", false, text);
      } catch (e) {}

      if (!inserted || !targetNode.textContent?.trim()) {
        try {
          targetNode.textContent = text;
        } catch (e) {}
      }

      // Disparar eventos de input que acionam a busca do WhatsApp
      try {
        targetNode.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "insertText", data: text }));
        targetNode.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText", data: text }));
        targetNode.dispatchEvent(new Event("input", { bubbles: true }));
        targetNode.dispatchEvent(new Event("change", { bubbles: true }));
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

    // Helper para extrair e validar telefone do Brasil (DDD + 8 ou 9 dígitos = 10 ou 11 dígitos)
    cleanPhoneNumber: function (raw) {
      if (!raw) return null;
      let digits = String(raw).replace(/\D/g, "");
      if (!digits) return null;

      // Se começar com DDI 55 e tiver 12 ou 13 dígitos, remove o 55
      if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
        digits = digits.slice(2);
      } else if (digits.startsWith("55") && digits.length === 10 && !digits.startsWith("559") && !digits.startsWith("558")) {
        // Ex: 55 + 8 dígitos
        digits = digits.slice(2);
      }

      // Telefone brasileiro válido (com ou sem DDD: 8 a 11 dígitos)
      if (digits.length >= 8 && digits.length <= 11) {
        return digits;
      }
      return null;
    },

    // 5. Extrai o telefone/nome da conversa ativa (busca telefone real mesmo com contato salvo)
    getActiveChatInfo: function () {
      try {
        let phone = null;
        let titleText = "";

        // Helper para extrair JID de string
        const extractJidDigits = (str) => {
          if (!str || typeof str !== "string") return null;
          const match = str.match(/(\d{10,13})@c\.us/) || str.match(/u=(\d{10,13})/) || str.match(/(\d{10,13})%40c\.us/) || str.match(/^(\d{10,13})$/);
          if (match && match[1]) {
            return this.cleanPhoneNumber(match[1]);
          }
          return null;
        };

        // Helper para obter o telefone do próprio usuário logado e NUNCA confundi-lo com o contato
        const getSelfPhone = () => {
          try {
            // 1. Chaves de sessão e identidade no localStorage do WhatsApp Web
            const storageKeys = ["last-wid-md", "last-wid", "me-user", "me"];
            for (const key of storageKeys) {
              const val = localStorage.getItem(key);
              if (val) {
                const m = String(val).match(/(\d{10,13})/);
                if (m && m[1]) {
                  const cleaned = this.cleanPhoneNumber(m[1]);
                  if (cleaned) return cleaned;
                }
              }
            }

            // 2. Webpack Store interna
            const store = window.WhatsAppStore || window.Store;
            if (store) {
              const selfWid =
                store.User?.getMe?.()?.user ||
                store.Conn?.wid?.user ||
                store.Me?.wid?.user ||
                store.User?.getMaybeMeUser?.()?.user;
              if (selfWid) return this.cleanPhoneNumber(selfWid);
            }

            // 3. Avatar próprio do usuário no topo da lista lateral (#side header)
            const sideHeaderImg = document.querySelector("#side header img[src*='u=']");
            if (sideHeaderImg) {
              const src = sideHeaderImg.getAttribute("src") || "";
              const m = src.match(/u=(\d{10,13})/);
              if (m && m[1]) return this.cleanPhoneNumber(m[1]);
            }
          } catch (e) {}
          return null;
        };
        const selfPhone = getSelfPhone();

        const isSelfOrInvalid = (p) => {
          if (!p) return true;
          const cleanP = String(p).replace(/\D/g, "");
          if (cleanP.length < 8) return true;
          
          // Bloqueio estrito do número do próprio operador (Antony Barbosa / 8198705664)
          if (cleanP.endsWith("98705664") || cleanP.endsWith("8705664") || cleanP.includes("98705664")) {
            return true;
          }

          if (selfPhone && (cleanP === selfPhone || cleanP.endsWith(selfPhone.slice(-8)) || selfPhone.endsWith(cleanP.slice(-8)))) {
            return true;
          }
          return false;
        };

        // ESTRATÉGIA 0: Seção de Dados do Contato / Gaveta aberta (limpeza de caracteres Unicode)
        try {
          const sectionSpans = document.querySelectorAll("#app section span, #app section div, [role='region'] span, [role='region'] div, div[tabindex='-1'] span");
          for (const sp of sectionSpans) {
            const rawText = (sp.innerText || sp.textContent || "").trim();
            if (!rawText) continue;
            // Remove pontuações e caracteres invisíveis do WhatsApp Web
            const onlyDigits = rawText.replace(/\D/g, "");
            if (onlyDigits.length >= 10 && onlyDigits.length <= 13) {
              const cleaned = this.cleanPhoneNumber(onlyDigits);
              if (cleaned && !isSelfOrInvalid(cleaned)) {
                phone = cleaned;
                console.log("[WhatsApp Skill] Telefone extraído da seção de contato:", phone, "texto:", rawText);
                break;
              }
            }
          }
        } catch (e) {}

        // ESTRATÉGIA 1: Avatar do contato ativo no cabeçalho (#main header) ou lista (#side ativo)
        if (!phone) {
          try {
            const avatarElements = [
              document.querySelector("#main header img[src*='u=']"),
              document.querySelector("#side [aria-selected='true'] img[src*='u=']"),
            ].filter(Boolean);

            for (const img of avatarElements) {
              const src = img.getAttribute("src") || "";
              const match = src.match(/u=(\d{10,13})/);
              if (match && match[1]) {
                const cleaned = this.cleanPhoneNumber(match[1]);
                if (cleaned && !isSelfOrInvalid(cleaned)) {
                  phone = cleaned;
                  console.log("[WhatsApp Skill] Telefone extraído da URL do avatar do contato:", phone);
                  break;
                }
              }
            }
          } catch (e) {}
        }

        // ESTRATÉGIA 2: Varredura de atributos DOM no nó do contato (#side ativo e #main header)
        if (!phone) {
          try {
            const elementsToScan = [
              ...document.querySelectorAll("#main header *"),
              ...document.querySelectorAll("#side [aria-selected='true'] *"),
              ...document.querySelectorAll("#side [aria-selected='true']"),
            ];

            for (const el of elementsToScan) {
              if (el.attributes) {
                for (let i = 0; i < el.attributes.length; i++) {
                  const attrVal = el.attributes[i].value;
                  if (attrVal && typeof attrVal === "string") {
                    const cleaned = extractJidDigits(attrVal);
                    if (cleaned && !isSelfOrInvalid(cleaned)) {
                      phone = cleaned;
                      console.log("[WhatsApp Skill] Telefone extraído via atributo DOM (" + el.attributes[i].name + "):", phone);
                      break;
                    }
                  }
                }
              }
              if (phone) break;
            }
          } catch (e) {}
        }

        // ESTRATÉGIA 3: React Fiber seguro focado exclusivamente no cabeçalho do chat
        if (!phone) {
          try {
            const checkObjectForPhone = (obj, depth = 0, seen = new Set()) => {
              if (!obj || depth > 4 || typeof obj !== "object" || seen.has(obj)) return null;
              seen.add(obj);

              if (typeof obj._serialized === "string" && !obj._serialized.includes("@g.us")) {
                const m = obj._serialized.match(/(\d{10,13})@c\.us/);
                if (m && m[1]) {
                  const c = this.cleanPhoneNumber(m[1]);
                  if (c && !isSelfOrInvalid(c)) return c;
                }
              }
              if (typeof obj.user === "string" && /^\d{10,13}$/.test(obj.user)) {
                const c = this.cleanPhoneNumber(obj.user);
                if (c && !isSelfOrInvalid(c)) return c;
              }
              if (typeof obj.jid === "string" && !obj.jid.includes("@g.us")) {
                const m = obj.jid.match(/(\d{10,13})@c\.us/);
                if (m && m[1]) {
                  const c = this.cleanPhoneNumber(m[1]);
                  if (c && !isSelfOrInvalid(c)) return c;
                }
              }
              if (typeof obj.phoneNumber === "string") {
                const c = this.cleanPhoneNumber(obj.phoneNumber);
                if (c && !isSelfOrInvalid(c)) return c;
              }

              for (const k in obj) {
                if (["chat", "contact", "activeChat", "id", "item", "user", "props", "data", "model"].includes(k)) {
                  const res = checkObjectForPhone(obj[k], depth + 1, seen);
                  if (res) return res;
                }
              }
              return null;
            };

            const rootProbeElements = [
              document.querySelector("#main header div[role='button']"),
              document.querySelector("#side [aria-selected='true']"),
            ].filter(Boolean);

            for (const el of rootProbeElements) {
              for (const prop in el) {
                if (prop.startsWith("__reactFiber$") || prop.startsWith("__reactInternalInstance$") || prop.startsWith("__reactProps$")) {
                  const found = checkObjectForPhone(el[prop]);
                  if (found && !isSelfOrInvalid(found)) {
                    phone = found;
                    console.log("[WhatsApp Skill] Telefone extraído via React Fiber seguro:", phone);
                    break;
                  }
                }
              }
              if (phone) break;
            }
          } catch (e) {}
        }

        // ESTRATÉGIA 4: Objeto interno Webpack / Store do WhatsApp Web
        if (!phone) {
          try {
            const store = window.WhatsAppStore || window.Store;
            if (store) {
              let activeChat = null;
              if (typeof store.getActiveChat === "function") {
                activeChat = store.getActiveChat();
              }
              if (!activeChat && store.Chat) {
                if (typeof store.Chat.getActive === "function") {
                  activeChat = store.Chat.getActive();
                } else if (typeof store.Chat.getActiveChat === "function") {
                  activeChat = store.Chat.getActiveChat();
                }
              }

              if (activeChat && activeChat.id) {
                const jidUser = activeChat.id.user || (activeChat.id._serialized || "").split("@")[0];
                if (jidUser && !activeChat.isGroup && !activeChat.id._serialized?.includes("@g.us")) {
                  const cleaned = this.cleanPhoneNumber(jidUser);
                  if (cleaned && !isSelfOrInvalid(cleaned)) {
                    phone = cleaned;
                    titleText = activeChat.name || activeChat.formattedTitle || "";
                    console.log("[WhatsApp Skill] Telefone extraído do WhatsAppStore:", phone, "Nome:", titleText);
                  }
                }
              }
            }
          } catch (e) {}
        }

        // ESTRATÉGIA 5: Leitura do Título Visível do Cabeçalho (Nome do Contato ou Número)
        const isIgnoredText = (txt) => {
          if (!txt || typeof txt !== "string") return true;
          const low = txt.toLowerCase().trim();
          return (
            low === "você" ||
            low === "you" ||
            low.includes("mensagens para mim") ||
            low.includes("mensagens para você") ||
            low.includes("message yourself") ||
            low.includes("online") ||
            low.includes("visto por último") ||
            low.includes("digitando") ||
            low.includes("clique aqui para") ||
            low.includes("clique para mostrar") ||
            low.includes("dados do contato") ||
            low.includes("dados do grupo") ||
            low.includes("mensagens temporárias")
          );
        };

        const headerBtn = document.querySelector("#main header div[role=\"button\"]");
        if (headerBtn) {
          const titleCandidates = headerBtn.querySelectorAll("h2, span[title], span._ao3e, span[dir=\"auto\"]");
          for (const el of titleCandidates) {
            const val = (el.getAttribute("title") || el.innerText || "").trim();
            if (val && !isIgnoredText(val)) {
              titleText = val;
              break;
            }
          }
        }

        if (!titleText) {
          const titleSelectors = window.WhatsAppSelectors.activeChatHeaderTitle;
          for (const sel of titleSelectors) {
            const elements = document.querySelectorAll(sel);
            for (const el of elements) {
              const val = (el.getAttribute("title") || el.innerText || "").trim();
              if (val && !isIgnoredText(val)) {
                titleText = val;
                break;
              }
            }
            if (titleText) break;
          }
        }

        let cleanText = (titleText || "").replace(/\(você\)/gi, "").replace(/\(you\)/gi, "").trim();

        if (!phone) {
          const rawHeaderPhone = this.cleanPhoneNumber(cleanText);
          if (rawHeaderPhone && !isSelfOrInvalid(rawHeaderPhone)) {
            phone = rawHeaderPhone;
          }
        }

        const chatKey = cleanText ? cleanText.toLowerCase() : "";

        // Se encontrou o telefone agora, salva no cache associado ao nome deste contato específico
        if (phone && !isSelfOrInvalid(phone)) {
          if (chatKey) {
            window._whatsappKnownChatPhones = window._whatsappKnownChatPhones || new Map();
            window._whatsappKnownChatPhones.set(chatKey, phone);
          }
        } else if (!phone) {
          // Se a gaveta de dados foi fechada, recupera o telefone cacheado especificamente para este contato
          if (chatKey && window._whatsappKnownChatPhones && window._whatsappKnownChatPhones.has(chatKey)) {
            phone = window._whatsappKnownChatPhones.get(chatKey);
          }
        }

        return {
          name: cleanText || titleText,
          phone: phone, // Telefone real extraído (ex: "81992329749" ou "8192723826")
          isPhone: !!phone,
        };
      } catch (e) {
        return { name: "", phone: null, isPhone: false };
      }
    },
  };
})();
