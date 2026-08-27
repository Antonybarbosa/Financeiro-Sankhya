// Chrome Extension Background Service Worker
// Modifica cabeçalhos HTTP de requisição e resposta para permitir o carregamento do WhatsApp Web em iframe no Financeiro Sankhya

const RULE_ID_HEADERS = 1;

async function setupHeaderRules() {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [RULE_ID_HEADERS],
      addRules: [
        {
          id: RULE_ID_HEADERS,
          priority: 1,
          action: {
            type: "modifyHeaders",
            requestHeaders: [
              { header: "sec-fetch-dest", operation: "set", value: "document" },
              { header: "sec-fetch-site", operation: "set", value: "none" },
              { header: "sec-fetch-mode", operation: "set", value: "navigate" }
            ],
            responseHeaders: [
              { header: "x-frame-options", operation: "remove" },
              { header: "frame-options", operation: "remove" },
              { header: "content-security-policy", operation: "remove" },
              { header: "content-security-policy-report-only", operation: "remove" }
            ]
          },
          condition: {
            urlFilter: "https://web.whatsapp.com/*",
            resourceTypes: ["sub_frame", "main_frame", "xmlhttprequest", "other"]
          }
        }
      ]
    });
    console.log("[Sankhya Bridge] Regras de desativação de bloqueios ativas.");
  } catch (err) {
    console.error("[Sankhya Bridge] Erro ao aplicar regras de cabeçalho:", err);
  }
}

// Executa na inicialização do service worker
setupHeaderRules();

chrome.runtime.onInstalled.addListener(() => {
  setupHeaderRules();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PING_EXTENSION") {
    sendResponse({ status: "ACTIVE", version: "1.0.2" });
  }
  return true;
});
