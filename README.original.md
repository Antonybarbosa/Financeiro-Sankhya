# 🚀 Guia de Início Rápido - Financeiro Sankhya

## 📋 Visão Geral

Sistema de cobrança com integração Sankhya, separado em **backend** (API REST) e **frontend** (interface web).

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

O frontend será implementado em um segundo momento. Veja `frontend/README.md` para detalhes.

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

No diretório `backend/`, edite o arquivo `.env`:

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

- **[ESTRUTURA.md](./ESTRUTURA.md)** - Estrutura de diretórios e organização
- **[EXEMPLOS_USO.md](./EXEMPLOS_USO.md)** - Exemplos completos de uso da API
- **[IMPLEMENTACAO.md](./IMPLEMENTACAO.md)** - Detalhes técnicos da implementação
- **[SANKHYA_API_GUIDE.md](./SANKHYA_API_GUIDE.md)** - Guia de integração com Sankhya
- **[ESTRUTURA_TABELAS.md](./ESTRUTURA_TABELAS.md)** - Estrutura das tabelas TGFTEL e TGFFIN
- **[BOLETO.md](./BOLETO.md)** - Visualização de boletos (layout, fluxo de dados, pendências)
- **[frontend/README.md](./frontend/README.md)** - Planejamento do frontend

## 🎯 Funcionalidades

### ✅ Backend (Implementado)
- ✅ Consulta de títulos financeiros (TGFFIN)
- ✅ Identificação de vencidos e baixas
- ✅ Sistema de cobrança
- ✅ Registro de contatos/chamadas (TGFTEL)
- ✅ Dashboard KPIs
- ✅ Integração Sankhya
- ✅ API REST completa

### ⏳ Frontend (Planejado)
- ⏳ Dashboard visual
- ⏳ Gestão de títulos
- ⏳ Sistema de cobranças
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

Após iniciar o backend, teste os endpoints:

```bash
# Health check
curl http://localhost:3001/health

# Dashboard KPIs
curl http://localhost:3001/api/cobranca/dashboard/kpis

# Lista de títulos
curl http://localhost:3001/api/cobranca/titulos
```

## 🆘 Suporte

Para problemas ou dúvidas:
1. Verifique a documentação nos arquivos `.md`
2. Confira os logs do servidor
3. Teste os endpoints individualmente
4. Revise a configuração do `.env`

## 🎓 Próximos Passos

1. ✅ Backend implementado e funcional
2. ⏳ Desenvolver frontend
3. ⏳ Implementar autenticação
4. ⏳ Adicionar testes
5. ⏳ Deploy em produção

---

**Status**: ✅ **Backend Pronto** | ⏳ **Frontend em Planejamento**  
**Data**: 04/08/2026  
**Versão**: 1.0.0