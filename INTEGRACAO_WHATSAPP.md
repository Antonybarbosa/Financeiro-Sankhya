# 💬 Documentação da Integração WhatsApp Web - Financeiro Sankhya

## 📋 1. Visão Geral

Esta documentação detalha a arquitetura, componentes, fluxo de dados e guia de instalação da **Integração do WhatsApp Web com o Sistema Financeiro Sankhya**.

A solução viabiliza o uso do WhatsApp Web oficial integrado à aplicação através de uma **extensão companheira do Chrome**, um **drawer assistente flutuante mantido vivo no DOM**, um **painel contextual com a Fila de Cobrança (Lista + Detalhe)** e rotas especializadas no **backend NestJS**.

---

## 🏗️ 2. Arquitetura e Decisões Técnicas

### 🟢 O Desafio de Segurança dos Navegadores
O WhatsApp Web (`web.whatsapp.com`) impõe restrições de segurança HTTP (`X-Frame-Options: SAMEORIGIN` e `Content-Security-Policy`) que impedem o carregamento em `<iframe>` dentro de aplicações web de origens diferentes (`http://localhost:3000`).

### 🛠️ A Solução (Abordagem A: Extensão Companheira V3 + Bridge Event-Driven)
1. **Extensão Chrome Companheira V3 (`extension/`)**:
   - Usa `chrome.declarativeNetRequest` no `background.js` para modificar dinamicamente os cabeçalhos de requisição e resposta do navegador:
     - Remove `X-Frame-Options` e `Content-Security-Policy`.
     - Injeta `sec-fetch-dest: document` e `sec-fetch-site: none`.
   - O `content.js` roda no WhatsApp Web e estabelece uma ponte de comunicação via `postMessage` bidirecional com a aplicação Next.js.
2. **Drawer Assistente Flutuante Global (`GlobalWhatsAppDrawer.tsx`)**:
   - Montado no `AppShell.tsx`, fica mantido vivo no DOM (`display: none` / `flex`).
   - Garante que a sessão do WhatsApp Web e o login por QR Code **nunca sejam perdidos ou deslogados** ao alternar de páginas.
   - Posicionamento dinâmico (`left-16` quando o menu lateral está recolhido e `left-64` quando expandido) ocupando 100% do espaço útil da tela.
3. **Painel Financeiro Sankhya + Fila de Cobrança (Lista + Detalhe)**:
   - *Parte Superior*: Exibe dados do cliente ativo (Razão Social, CNPJ/CPF, Limite de Crédito, Títulos em Aberto, Boletos PDF, Chave PIX e Editor de Mensagem com Interpolação).
   - *Parte Inferior*: Apresenta a **Fila de Cobrança (Lista + Detalhe)** em tempo real. Ao clicar em qualquer parceiro da lista, o sistema seleciona o cliente, carrega os títulos e abre o chat no WhatsApp Web.

---

## 📁 3. Estrutura de Arquivos Criados

```
Financeiro Sankhya/
├── 📁 extension/                           # Extensão Companheira do Chrome V3
│   ├── 📄 manifest.json                    # Manifesto V3 (Permissões de Rede + Host)
│   ├── 📄 background.js                    # Service Worker (Modificação de Cabeçalhos HTTP)
│   └── 📄 content.js                       # Content Script (DOM Watcher & Bridge Event-Driven)
│
├── 📁 backend/src/presentation/whatsapp/    # Módulo Backend NestJS
│   ├── 📄 whatsapp.controller.ts           # Endpoints: Buscar Cliente, Títulos e Registrar Histórico
│   └── 📄 whatsapp.module.ts               # Registro no NestJS
│
└── 📁 frontend/
    ├── 📁 app/whatsapp/
    │   └── 📄 page.tsx                     # Rota da página /whatsapp
    ├── 📁 components/whatsapp/
    │   ├── 📄 GlobalWhatsAppDrawer.tsx      # Drawer assistente flutuante mantido vivo
    │   ├── 📄 WhatsAppEmbeddedTab.tsx      # Container do WhatsApp Web fluído
    │   └── 📄 SankhyaCustomerContextPanel.tsx # Painel Financeiro + Fila de Cobrança (Lista + Detalhe)
    ├── 📁 store/
    │   └── 📄 whatsappStore.ts             # Estado global Zustand do WhatsApp
    └── 📁 lib/
        └── 📄 whatsappBridge.ts            # Barramento de eventos postMessage
```

---

## 📡 4. Endpoints da API no Backend (NestJS)

### 🔍 Buscar Cliente por Telefone
```http
GET /api/whatsapp/cliente-por-telefone?telefone=5511999998888
```
- Realiza busca flexível nos parceiros (`TGFPAR`) e contatos (`TGFCTT`) do Sankhya pelos últimos dígitos do telefone.

### 📄 Buscar Títulos em Aberto por Telefone
```http
GET /api/whatsapp/titulos-por-telefone?telefone=5511999998888
```
- Retorna os dados do cliente e a relação de títulos pendentes em aberto (`TGFFIN`), total de dívida e vencimentos.

### ✍️ Registrar Atendimento no Histórico Sankhya
```http
POST /api/whatsapp/registrar-historico
Content-Type: application/json

{
  "parceiroId": 720,
  "mensagem": "Enviado boleto do título N. 10243 via WhatsApp",
  "nuFin": 10243
}
```
- Grava o atendimento de cobrança na tabela de histórico de chamadas/atendimentos (`TGFTEL`).

---

## 🧩 5. Guia de Instalação da Extensão Chrome

1. Abra o navegador Google Chrome e acesse: `chrome://extensions/`
2. No canto superior direito, ative o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** (*Load unpacked*).
4. Selecione a pasta da extensão no diretório do projeto:
   `...\Financeiro Sankhya\extension`
5. Acesse o sistema ([http://localhost:3000](http://localhost:3000)) e clique no botão flutuante **`💬 WhatsApp Web`**.

---

## 🔄 6. Fluxo de Execução e Disparo de Mensagens

1. **Detecção do Contato**: Ao selecionar uma conversa no WhatsApp Web ou clicar em um cliente da **Fila de Cobrança**, a extensão envia o evento `SANKHYA_CHAT_CHANGED` via `postMessage`.
2. **Consulta de Dados**: O sistema consulta a API `/api/whatsapp/titulos-por-telefone` e atualiza o **Painel Financeiro Sankhya**.
3. **Interpolação do Modelo**: A mensagem de cobrança é gerada automaticamente substituindo as variáveis (`{nome_parceiro}`, `{valor_total}`, `{lista_titulos_detalhada}`).
4. **Inserção & Envio**: O operador clica em **"Inserir & Enviar no WhatsApp"**. O `whatsappBridge.ts` envia o evento `SANKHYA_SEND_TEXT` para o WhatsApp Web, inserindo o texto formatado no campo de mensagem do chat e efetuando o disparo, enquanto grava o histórico no Sankhya.

---

## 📱 7. Extração Avançada de Telefone e Resiliência

Para detalhes sobre como a extensão extrai o número real de contatos salvos por nome através da gaveta lateral (XPath), Webpack Store e React Fiber, consulte:
📄 **[docs/EXTRACAO_TELEFONE_WHATSAPP.md](docs/EXTRACAO_TELEFONE_WHATSAPP.md)**.
