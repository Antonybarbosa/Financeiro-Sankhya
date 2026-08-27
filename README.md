# 🚀 Guia de Início Rápido - Financeiro Sankhya

## 📋 Visão Geral

Sistema cobrança com integração Sankhya. Split **backend** (API REST) + **frontend** (web).

## 🏃‍♂️ Início Rápido

### 1. Backend (API REST)

```bash
# Entrar no diretório do backend
cd backend

# Instalar dependências
npm install

# Iniciar servidor
npm run dev
```

**API disponível em:** `http://localhost:3001`

**Health check:** `http://localhost:3001/health`

### 2. Frontend (Em desenvolvimento)

Frontend implementado depois. Veja `frontend/README.md`.

## 📡 API Principal

### Dashboard
```bash
curl http://localhost:3001/api/cobranca/dashboard/kpis
```

### Títulos (TGFFIN)
```bash
# Listar títulos em aberto
curl http://localhost:3001/api/cobranca/titulos

# Títulos vencidos
curl http://localhost:3001/api/cobranca/titulos/vencidos

# Títulos a vencer
curl http://localhost:3001/api/cobranca/titulos/a-vencer
```

### Contatos / Chamadas (TGFTEL)
```bash
# Registrar contato
curl -X POST http://localhost:3001/api/cobranca/contatos \
  -H "Content-Type: application/json" \
  -d '{
    "parceiroId": 720,
    "tipo": "WHATSAPP",
    "comentarios": "Cliente vai pagar amanhã",
    "nuFin": 1234
  }'

# Listar pendentes
curl "http://localhost:3001/api/cobranca/contatos?pendentes=true"
```

### Cobranças
```bash
# Criar cobrança
curl -X POST http://localhost:3001/api/cobranca/cobrancas \
  -H "Content-Type: application/json" \
  -d '{
    "tituloId": 1234,
    "tipo": "EMAIL",
    "dataAgendamento": "2026-08-05T10:00:00.000Z",
    "mensagem": "Lembrete de pagamento",
    "destinatario": "cliente@email.com"
  }'
```

## 📁 Estrutura do Projeto

```
financeiro-sankhya/
├── 📁 backend/           # API REST - NestJS
├── 📁 frontend/          # Interface Web - (Futuro)
├── 📄 README.md          # Este arquivo
├── 📄 ESTRUTURA.md       # Estrutura detalhada
├── 📄 EXEMPLOS_USO.md    # Exemplos de API
├── 📄 IMPLEMENTACAO.md   # Detalhes técnicos
└── 📄 SANKHYA_API_GUIDE.md  # Guia Sankhya
```

## 🔧 Configuração

### Backend (.env)

Em `backend/`, edite `.env`:

```env
PORT=3001
NODE_ENV=development

# Gateway Sankhya (já configurado)
GATEWAY_URL=https://api.sandbox.sankhya.com.br
GATEWAY_CLIENT_ID=seu-client-id
GATEWAY_CLIENT_SECRET=seu-client-secret
GATEWAY_X_TOKEN=seu-x-token

# CORS
CORS_ORIGIN=http://localhost:5173

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

## 📚 Documentação

- **[INTEGRACAO_WHATSAPP.md](./INTEGRACAO_WHATSAPP.md)** - **Documentação completa da Integração WhatsApp Web (Extensão Chrome V3 + Drawer + Ponte Event-Driven)**
- **[ESTRUTURA.md](./ESTRUTURA.md)** - Estrutura diretórios + organização
- **[EXEMPLOS_USO.md](./EXEMPLOS_USO.md)** - Exemplos API
- **[IMPLEMENTACAO.md](./IMPLEMENTACAO.md)** - Detalhes técnicos
- **[SANKHYA_API_GUIDE.md](./SANKHYA_API_GUIDE.md)** - Guia integração Sankhya
- **[ESTRUTURA_TABELAS.md](./ESTRUTURA_TABELAS.md)** - Estrutura tabelas TGFTEL + TGFFIN
- **[BOLETO.md](./BOLETO.md)** - Visualização boletos (layout, fluxo dados, pendências)
- **[frontend/README.md](./frontend/README.md)** - Planejamento frontend

## 🎯 Funcionalidades

### ✅ Backend (Implementado)
- ✅ Consulta títulos financeiros (TGFFIN)
- ✅ Identificação vencidos + baixas
- ✅ Sistema cobrança
- ✅ Registro contatos/chamadas (TGFTEL)
- ✅ Endpoints da Integração WhatsApp Web (`/api/whatsapp`)
- ✅ Dashboard KPIs
- ✅ Integração Sankhya
- ✅ API REST completa

### ✅ WhatsApp Web & Extensão Chrome Companion (Implementado)
- ✅ Extensão Chrome Manifest V3 (`extension/`) para bypass de cabeçalhos de iframe
- ✅ Drawer assistente flutuante mantido vivo no DOM (`GlobalWhatsAppDrawer.tsx`)
- ✅ Painel contextual Sankhya com Fila de Cobrança (Lista + Detalhe)
- ✅ Interpolação de modelos de mensagem e inserção no WhatsApp Web com 1-clique
- ✅ Registro automático de históricos no Sankhya (`TGFTEL`)

### ⏳ Frontend (Planejado)
- ⏳ Dashboard visual
- ⏳ Gestão títulos
- ⏳ Sistema cobranças
- ⏳ Relatórios
- ⏳ Autenticação

## 🚀 Scripts Úteis

### Backend
```bash
cd backend

# Desenvolvimento
npm run dev

# Compilar
npm run build

# Produção
npm start

# Windows
start.bat

# Linux/Mac
./start.sh
```

## 📊 Status do Sistema

| Componente | Status | Versão |
|------------|--------|--------|
| Backend API | ✅ Funcional | 1.0.0 |
| Frontend Web | ⏳ Planejado | - |
| Integração Sankhya | ✅ Conectada | Sandbox |
| Documentação | ✅ Completa | - |

## 🔍 Teste Rápido

Após iniciar backend, teste endpoints:

```bash
# Health check
curl http://localhost:3001/health

# Dashboard KPIs
curl http://localhost:3001/api/cobranca/dashboard/kpis

# Lista de títulos
curl http://localhost:3001/api/cobranca/titulos
```

## 🆘 Suporte

Problemas/dúvidas:
1. Verifique docs `.md`
2. Confira logs servidor
3. Teste endpoints individualmente
4. Revise config `.env`

## 🎓 Próximos Passos

1. ✅ Backend implementado e funcional
2. ⏳ Desenvolver frontend
3. ⏳ Implementar autenticação
4. ⏳ Adicionar testes
5. ⏳ Deploy produção

---

**Status**: ✅ **Backend Pronto** | ⏳ **Frontend em Planejamento**  
**Data**: 04/08/2026  
**Versão**: 1.0.0
