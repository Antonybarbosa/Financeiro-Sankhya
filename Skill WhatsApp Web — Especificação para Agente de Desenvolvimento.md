# Skill WhatsApp Web — Especificação para Agente de Desenvolvimento

## 1. Objetivo

Construir uma extensão Chrome baseada em **Manifest V3** que funcione como uma **Skill de automação do WhatsApp Web**.

A extensão deverá permitir que um agente externo envie comandos semânticos para controlar uma sessão já aberta do WhatsApp Web e receba eventos da interface.

O agente **não deve conhecer os seletores, estrutura HTML ou detalhes internos do WhatsApp Web**.

A comunicação deverá utilizar comandos de alto nível, por exemplo:

```json
{
  "action": "send_message",
  "payload": {
    "message": "Olá, tudo bem?"
  }
}
```

A extensão será responsável por transformar esse comando em operações no DOM.

---

# 2. Arquitetura obrigatória

Utilizar a seguinte arquitetura:

```text
┌──────────────────────────────┐
│          AGENTE              │
│                              │
│ LLM / Backend / n8n / API    │
└──────────────┬───────────────┘
               │
               │ JSON
               ▼
┌──────────────────────────────┐
│       WHATSAPP SKILL         │
│                              │
│ Comandos semânticos          │
│ Eventos                     │
│ Casos de uso                │
└──────────────┬───────────────┘
               │
               │ Chrome Messaging
               ▼
┌──────────────────────────────┐
│       SERVICE WORKER         │
│                              │
│ background/service-worker.js │
└──────────────┬───────────────┘
               │
               │ chrome.tabs.sendMessage
               ▼
┌──────────────────────────────┐
│       CONTENT SCRIPT         │
│                              │
│ controller.js                │
│ events.js                    │
│ selectors.js                 │
│ wait.js                      │
└──────────────┬───────────────┘
               │
               │ DOM / Events
               ▼
┌──────────────────────────────┐
│       WHATSAPP WEB           │
└──────────────────────────────┘
```

A extensão deve utilizar somente as permissões necessárias.

O Chrome disponibiliza APIs específicas para extensões, incluindo content scripts, mensagens e gerenciamento de abas.

---

# 3. Estrutura do projeto

Criar exatamente esta estrutura inicial:

```text
whatsapp-agent-skill/
│
├── manifest.json
├── README.md
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── PROTOCOL.md
│   └── TESTING.md
│
└── src/
    │
    ├── background/
    │   └── service-worker.js
    │
    ├── content/
    │   ├── content.js
    │   │
    │   └── whatsapp/
    │       ├── controller.js
    │       ├── events.js
    │       ├── selectors.js
    │       ├── wait.js
    │       ├── dom.js
    │       └── message-parser.js
    │
    ├── application/
    │   ├── commands/
    │   │   ├── SendMessage.js
    │   │   ├── OpenChat.js
    │   │   ├── FindContact.js
    │   │   └── GetMessages.js
    │   │
    │   └── events/
    │       └── EventBus.js
    │
    ├── popup/
    │   ├── popup.html
    │   ├── popup.js
    │   └── popup.css
    │
    └── options/
        ├── options.html
        └── options.js
```

---

# 4. Manifest

Criar `manifest.json` utilizando Manifest V3.

Estrutura mínima:

```json
{
  "manifest_version": 3,
  "name": "WhatsApp Agent Skill",
  "version": "1.0.0",
  "description": "Skill de automação do WhatsApp Web para agentes.",
  "permissions": [
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "https://web.whatsapp.com/*"
  ],
  "background": {
    "service_worker": "src/background/service-worker.js",
    "type": "module"
  },
  "action": {
    "default_title": "WhatsApp Agent Skill",
    "default_popup": "src/popup/popup.html"
  },
  "content_scripts": [
    {
      "matches": [
        "https://web.whatsapp.com/*"
      ],
      "js": [
        "src/content/content.js"
      ],
      "run_at": "document_idle"
    }
  ],
  "options_page": "src/options/options.html"
}
```

Não utilizar Manifest V2.

---

# 5. Responsabilidades do Service Worker

O Service Worker deverá:

1. Receber comandos do agente.
2. Localizar a aba do WhatsApp Web.
3. Encaminhar comandos para o Content Script.
4. Receber respostas.
5. Encaminhar eventos para o agente.
6. Gerenciar `requestId`.
7. Implementar timeout.
8. Nunca manipular diretamente o DOM do WhatsApp.

Fluxo:

```text
Agente
  ↓
AGENT_COMMAND
  ↓
Service Worker
  ↓
WHATSAPP_COMMAND
  ↓
Content Script
```

Resposta:

```text
Content Script
  ↓
WHATSAPP_RESPONSE
  ↓
Service Worker
  ↓
Agente
```

---

# 6. Protocolo de comandos

Todos os comandos devem seguir:

```json
{
  "type": "WHATSAPP_COMMAND",
  "requestId": "uuid",
  "action": "nome_da_acao",
  "payload": {}
}
```

Exemplo:

```json
{
  "type": "WHATSAPP_COMMAND",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "action": "send_message",
  "payload": {
    "message": "Olá!"
  }
}
```

---

# 7. Protocolo de resposta

Toda ação deverá retornar:

```json
{
  "type": "WHATSAPP_RESPONSE",
  "requestId": "uuid",
  "success": true,
  "data": {}
}
```

Em caso de erro:

```json
{
  "type": "WHATSAPP_RESPONSE",
  "requestId": "uuid",
  "success": false,
  "error": {
    "code": "ELEMENT_NOT_FOUND",
    "message": "Campo de mensagem não encontrado."
  }
}
```

Nunca retornar somente uma string de erro.

---

# 8. Habilidades da Skill

Implementar inicialmente:

```text
status
get_current_chat
find_contact
open_chat
type_message
send_message
click_send
get_messages
get_last_message
wait_for_text
```

---

# 9. Habilidade: status

Comando:

```json
{
  "action": "status"
}
```

Resposta:

```json
{
  "connected": true,
  "url": "https://web.whatsapp.com/",
  "title": "WhatsApp"
}
```

Detectar:

- WhatsApp Web carregado;
- sessão conectada;
- sessão desconectada;
- página inexistente.

---

# 10. Habilidade: get_current_chat

Comando:

```json
{
  "action": "get_current_chat"
}
```

Resposta:

```json
{
  "name": "Cliente ABC",
  "phone": null
}
```

Não assumir que o nome é sempre suficiente.

Criar uma entidade interna:

```javascript
{
  name,
  phone,
  id
}
```

Quando a informação estiver disponível.

---

# 11. Habilidade: find_contact

Comando:

```json
{
  "action": "find_contact",
  "payload": {
    "contact": "Cliente ABC"
  }
}
```

A Skill deverá:

1. localizar o campo de pesquisa;
2. focar o campo;
3. limpar o conteúdo;
4. inserir o texto;
5. disparar evento de input;
6. aguardar os resultados;
7. identificar o resultado correspondente.

Resposta:

```json
{
  "found": true,
  "contact": "Cliente ABC"
}
```

---

# 12. Habilidade: open_chat

Comando:

```json
{
  "action": "open_chat",
  "payload": {
    "contact": "Cliente ABC"
  }
}
```

Fluxo:

```text
open_chat
    ↓
find_contact
    ↓
aguardar resultado
    ↓
selecionar resultado
    ↓
aguardar carregamento
    ↓
confirmar conversa atual
    ↓
chat_opened
```

Nunca considerar que o clique foi bem-sucedido somente porque `element.click()` executou.

É necessário confirmar o resultado.

---

# 13. Habilidade: type_message

Comando:

```json
{
  "action": "type_message",
  "payload": {
    "message": "Olá!"
  }
}
```

Fluxo:

```text
localizar campo
       ↓
focus()
       ↓
inserir texto
       ↓
disparar InputEvent
       ↓
confirmar conteúdo
       ↓
message_typed
```

Não utilizar apenas:

```javascript
element.innerText = message;
```

O campo deve receber eventos compatíveis com uma entrada de usuário.

---

# 14. Habilidade: send_message

Comando:

```json
{
  "action": "send_message",
  "payload": {
    "message": "Olá, tudo bem?"
  }
}
```

Fluxo:

```text
send_message
      ↓
type_message
      ↓
aguardar UI
      ↓
localizar botão enviar
      ↓
click
      ↓
aguardar confirmação
      ↓
message_sent
```

Não considerar o envio concluído apenas porque o botão foi clicado.

Criar mecanismo de confirmação.

---

# 15. Habilidade: get_messages

Comando:

```json
{
  "action": "get_messages",
  "payload": {
    "limit": 20
  }
}
```

Resposta:

```json
{
  "messages": [
    {
      "text": "Olá",
      "direction": "incoming",
      "timestamp": null
    },
    {
      "text": "Tudo bem?",
      "direction": "outgoing",
      "timestamp": null
    }
  ]
}
```

Criar um parser separado:

```text
message-parser.js
```

O parser não deve ficar misturado com os comandos.

---

# 16. Habilidade: get_last_message

Comando:

```json
{
  "action": "get_last_message"
}
```

Resposta:

```json
{
  "text": "Gostaria de saber o preço.",
  "direction": "incoming"
}
```

---

# 17. Habilidade: wait_for_text

Comando:

```json
{
  "action": "wait_for_text",
  "payload": {
    "text": "Pagamento aprovado",
    "timeout": 10000
  }
}
```

Implementar com `MutationObserver` e timeout.

Não utilizar polling agressivo.

Fluxo:

```text
wait_for_text
      ↓
MutationObserver
      ↓
DOM mudou?
      ↓
procurar texto
      ↓
encontrou?
   ┌──┴──┐
  SIM   NÃO
   ↓     ↓
resolve continua
```

---

# 18. Event Engine

Criar:

```text
WhatsAppEventEngine
```

Eventos iniciais:

```text
whatsapp_ready
whatsapp_disconnected
dom_changed
chat_opened
chat_closed
message_received
message_typed
message_sent
message_failed
contact_selected
```

Cada evento deve possuir:

```json
{
  "type": "WHATSAPP_EVENT",
  "event": "message_received",
  "timestamp": 1787850000000,
  "data": {}
}
```

---

# 19. MutationObserver

Utilizar `MutationObserver` para detectar mudanças relevantes na interface.

Não executar processamento pesado em toda mutação.

Errado:

```javascript
new MutationObserver(() => {
  processEverything();
});
```

Preferir:

```javascript
new MutationObserver(mutations => {
  analyzeRelevantChanges(mutations);
});
```

Implementar debounce/throttle quando necessário.

---

# 20. Seletores

Criar um único arquivo:

```text
src/content/whatsapp/selectors.js
```

Nunca espalhar seletores pelo projeto.

Exemplo:

```javascript
export const SELECTORS = {
  messageInput: [
    'div[contenteditable="true"][role="textbox"]'
  ],

  sendButton: [
    'button[aria-label="Enviar"]',
    'button[aria-label="Send"]'
  ],

  searchInput: [
    'div[contenteditable="true"][role="textbox"]'
  ]
};
```

Os seletores podem mudar.

Por isso a camada de infraestrutura deve ser isolada.

---

# 21. Wait Engine

Criar:

```text
wait.js
```

Responsável por:

```text
waitForElement()
waitForText()
waitForCondition()
waitForChat()
waitForMessage()
```

Todos devem possuir timeout.

Nunca criar:

```javascript
while (!element) {}
```

Nunca criar loops infinitos.

---

# 22. Tratamento de erros

Criar códigos padronizados:

```text
WHATSAPP_NOT_OPEN
WHATSAPP_NOT_CONNECTED
ELEMENT_NOT_FOUND
CHAT_NOT_FOUND
CONTACT_NOT_FOUND
MESSAGE_INPUT_NOT_FOUND
SEND_BUTTON_NOT_FOUND
MESSAGE_SEND_FAILED
TIMEOUT
INVALID_COMMAND
INVALID_PAYLOAD
```

Exemplo:

```json
{
  "success": false,
  "error": {
    "code": "SEND_BUTTON_NOT_FOUND",
    "message": "Não foi possível localizar o botão de envio."
  }
}
```

---

# 23. Segurança

Não aceitar comandos arbitrários de JavaScript.

Nunca implementar:

```json
{
  "action": "execute_javascript",
  "code": "..."
}
```

O agente deve trabalhar somente com uma lista explícita de habilidades.

Exemplo permitido:

```text
send_message
open_chat
get_messages
```

Exemplo proibido:

```text
execute_script
eval
execute_dom
run_code
```

---

# 24. Comunicação com agente externo

Criar uma camada para comunicação externa somente quando o agente estiver definido.

O Manifest poderá utilizar:

```json
{
  "externally_connectable": {
    "matches": [
      "https://seu-agente.exemplo.com/*"
    ]
  }
}
```

O domínio deve ser específico.

Não utilizar:

```json
"*://*/*"
```

ou permitir qualquer site.

O Chrome documenta `externally_connectable` como o mecanismo para determinar quais páginas podem se comunicar com uma extensão via `runtime.connect` e `runtime.sendMessage`.

---

# 25. Interface entre agente e Skill

Definir um contrato estável.

Exemplo:

```json
{
  "type": "WHATSAPP_COMMAND",
  "requestId": "abc123",
  "action": "open_chat",
  "payload": {
    "contact": "5511999999999"
  }
}
```

A Skill não deve depender da implementação do agente.

Assim:

```text
OpenAI
n8n
Node.js
Python
Outro agente
```

podem utilizar a mesma Skill.

---

# 26. Fluxo completo de atendimento

Implementar este cenário como teste de integração:

```text
1. Agente recebe mensagem
        ↓
2. Agente solicita status
        ↓
3. Skill confirma WhatsApp conectado
        ↓
4. Agente solicita open_chat
        ↓
5. Skill abre cliente
        ↓
6. Agente solicita get_messages
        ↓
7. Skill retorna histórico
        ↓
8. Agente interpreta
        ↓
9. Agente gera resposta
        ↓
10. Skill executa send_message
        ↓
11. Skill confirma envio
        ↓
12. Agente recebe message_sent
```

---

# 27. Exemplo completo

O agente recebe:

```text
Cliente: "Qual o preço da ração X?"
```

O agente pode executar:

```json
{
  "action": "get_current_chat"
}
```

Depois:

```json
{
  "action": "get_last_message"
}
```

O agente consulta uma API/ERP.

Recebe:

```json
{
  "product": "Ração X",
  "price": 129.90
}
```

Então chama:

```json
{
  "action": "send_message",
  "payload": {
    "message": "Olá! A Ração X está disponível por R$ 129,90."
  }
}
```

A Skill executa a interação no WhatsApp Web.

---

# 28. Separação Clean Architecture

Não misturar regras de negócio com DOM.

### Domain

```text
Message
Contact
Chat
WhatsAppEvent
```

### Application

```text
SendMessage
OpenChat
FindContact
GetMessages
```

### Infrastructure

```text
WhatsAppDOM
WhatsAppSelectors
WhatsAppEventObserver
WhatsAppMessageParser
```

### Presentation

```text
Popup
Options
Agent Adapter
```

Regra:

```text
Application NÃO conhece DOM.
Domain NÃO conhece Chrome.
Infrastructure conhece WhatsApp.
```

---

# 29. Critérios de qualidade

O agente de desenvolvimento deve verificar:

- [ ] Manifest V3.
- [ ] Service Worker separado do Content Script.
- [ ] DOM somente no Content Script.
- [ ] Seletores centralizados.
- [ ] Eventos centralizados.
- [ ] `MutationObserver`.
- [ ] Timeout em operações assíncronas.
- [ ] `requestId` em comandos.
- [ ] Tratamento padronizado de erros.
- [ ] Nenhum `eval`.
- [ ] Nenhum executor arbitrário de JavaScript.
- [ ] Nenhum seletor espalhado pelo projeto.
- [ ] Nenhum loop infinito.
- [ ] Comandos semânticos.
- [ ] Testes para cada habilidade.

---

# 30. Testes obrigatórios

Testar:

### Status

```text
WhatsApp aberto + conectado
WhatsApp aberto + desconectado
WhatsApp fechado
```

### Contato

```text
Contato existente
Contato inexistente
Nome parcial
Telefone
```

### Chat

```text
Abrir conversa
Trocar conversa
Conversa inexistente
```

### Mensagem

```text
Mensagem simples
Mensagem com acentuação
Mensagem com emoji
Mensagem com múltiplas linhas
Mensagem vazia
```

### Envio

```text
Envio bem-sucedido
Botão inexistente
Timeout
WhatsApp desconectado
```

### Eventos

```text
chat_opened
message_received
message_sent
message_failed
whatsapp_disconnected
```

---

# 31. Estratégia de manutenção

O WhatsApp Web pode modificar a estrutura do DOM.

Portanto, quando uma operação quebrar:

```text
NÃO alterar o caso de uso
        ↓
NÃO alterar o protocolo
        ↓
NÃO alterar o agente
        ↓
alterar somente Infrastructure
        ↓
selectors.js
dom.js
message-parser.js
```

Essa separação é obrigatória.

---

# 32. Regra fundamental para o agente desenvolvedor

Você está construindo uma **Skill**, não simplesmente um script de automação.

Portanto, não criar uma solução baseada em:

```javascript
document.querySelector(...)
document.querySelector(...)
document.querySelector(...)
```

espalhados por todos os arquivos.

A implementação deve seguir:

```text
AGENTE
   ↓
COMANDO SEMÂNTICO
   ↓
USE CASE
   ↓
WHATSAPP CONTROLLER
   ↓
DOM ADAPTER
   ↓
SELECTORS
   ↓
WHATSAPP WEB
```

---

# 33. Primeira versão — MVP

O MVP deverá funcionar com somente:

```text
status
open_chat
get_current_chat
get_last_message
send_message
```

Depois implementar:

```text
find_contact
get_messages
wait_for_text
message_received
message_sent
```

Depois:

```text
attachments
media
templates
labels
unread_messages
agent_events
external API
```

---

# 34. Entrega final

Ao terminar, entregar:

```text
whatsapp-agent-skill/
├── manifest.json
├── README.md
├── docs/
├── src/
└── tests/
```

Além disso, o agente deverá apresentar:

1. Como instalar.
2. Como iniciar.
3. Como testar.
4. Como enviar um comando.
5. Como receber um evento.
6. Como conectar um agente externo.
7. Como adicionar uma nova habilidade.
8. Como atualizar os seletores do WhatsApp.
9. Como diagnosticar erros.

---

# 35. Resultado esperado

Ao final, deve ser possível executar:

```json
{
  "action": "open_chat",
  "payload": {
    "contact": "Cliente ABC"
  }
}
```

seguido de:

```json
{
  "action": "send_message",
  "payload": {
    "message": "Olá! Como posso ajudar?"
  }
}
```

e receber:

```json
{
  "type": "WHATSAPP_EVENT",
  "event": "message_sent",
  "data": {
    "message": "Olá! Como posso ajudar?"
  }
}
```

O agente deve conseguir trabalhar com o WhatsApp sem conhecer a implementação interna da interface.

---

# 36. Próxima evolução

Após o MVP, implementar um **Agent Gateway**:

```text
                ┌──────────────┐
                │    AGENTE    │
                └──────┬───────┘
                       │
                       ▼
                ┌──────────────┐
                │ Agent Gateway│
                └──────┬───────┘
                       │
                       ▼
                ┌──────────────┐
                │ WhatsApp     │
                │ Skill        │
                └──────┬───────┘
                       │
                       ▼
                ┌──────────────┐
                │ WhatsApp Web │
                └──────────────┘
```

O Gateway será responsável por:

```text
Autenticação
Autorização
Rate limit
Request ID
Logs
Retries
Timeout
Auditoria
Eventos
```

Isso permitirá posteriormente integrar:

```text
OpenAI
n8n
Sankhya
CRM
APIs externas
Banco de dados
```

sem modificar a camada de automação do WhatsApp.