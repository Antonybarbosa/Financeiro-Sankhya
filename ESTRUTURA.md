# 📁 Estrutura de Diretórios - Financeiro Sankhya

## Organização do Projeto

Projeto organizado com split clara **backend** + **frontend** pra facilitar dev/deploy.

```
financeiro-sankhya/
├── 📁 backend/                    # API REST - NestJS (Clean Architecture)
│   ├── 📁 src/
│   │   ├── 📁 domain/            # Camada de Domínio
│   │   ├── 📁 application/       # Camada de Aplicação  
│   │   ├── 📁 infrastructure/    # Camada de Infraestrutura
│   │   └── 📁 presentation/      # Camada de Apresentação
│   ├── 📁 test/                  # Testes
│   ├── 📁 dist/                  # Build output
│   ├── 📁 node_modules/          # Dependências
│   ├── .env                      # Variáveis de ambiente
│   ├── .gitignore
│   ├── package.json              # Dependências backend
│   ├── tsconfig.json             # Configuração TypeScript
│   ├── start.sh                  # Script inicialização Linux/Mac
│   └── start.bat                 # Script inicialização Windows
│
├── 📁 frontend/                   # Interface Web - React/Vue (Futuro)
│   └── (para desenvolvimento futuro)
│
├── 📄 README.md                   # Documentação principal
├── 📄 EXEMPLOS_USO.md            # Exemplos de uso da API
├── 📄 IMPLEMENTACAO.md           # Detalhes da implementação
├── 📄 SANKHYA_API_GUIDE.md       # Guia integração Sankhya
└── 📄 ESTRUTURA.md               # Este arquivo
```

## 🚀 Como Usar

### Backend (API REST)

**Entrar no diretório backend:**
```bash
cd backend
```

**Instalar dependências:**
```bash
npm install
```

**Iniciar servidor:**

Windows:
```bash
start.bat
```

Linux/Mac:
```bash
chmod +x start.sh
./start.sh
```

Ou manualmente:
```bash
npm run dev        # Desenvolvimento
npm run build      # Compilar
npm start          # Produção
```

**API disponível em:** `http://localhost:3001`

### Frontend (Futuro)

Frontend desenvolvido depois. Opções:
- React + Next.js
- Vue.js + Nuxt.js
- Angular
- Outro framework preferido

## 📡 API Endpoints

Backend fornece API REST completa em `http://localhost:3001`:

### Health & Dashboard
- `GET /health` - Status sistema
- `GET /api/cobranca/dashboard/kpis` - KPIs dashboard

### Títulos (TGFFIN)
- `GET /api/cobranca/titulos` - Listar títulos em aberto
- `GET /api/cobranca/titulos/vencidos` - Títulos vencidos
- `GET /api/cobranca/titulos/a-vencer` - Títulos a vencer
- `GET /api/cobranca/titulos/em-aberto` - Todos em aberto
- `GET /api/cobranca/titulos/:id` - Buscar título por NUFIN
- `GET /api/cobranca/titulos/cliente/:id` - Títulos por cliente (CODPARC)
- `PUT /api/cobranca/titulos/:id/status` - Atualizar status

### Cobranças
- `POST /api/cobranca/cobrancas` - Criar cobrança
- `GET /api/cobranca/cobrancas` - Listar cobranças
- `GET /api/cobranca/cobrancas/:id` - Buscar cobrança
- `PUT /api/cobranca/cobrancas/:id` - Atualizar cobrança
- `PUT /api/cobranca/cobrancas/:id/entregue` - Marcar como entregue

### Contatos / Chamadas (TGFTEL)
- `POST /api/cobranca/contatos` - Registrar contato/chamada
- `GET /api/cobranca/contatos` - Listar (filtros: tipo, situacao, pendentes, proximas)
- `GET /api/cobranca/contatos/:id` - Detalhe contato
- `GET /api/cobranca/contatos/parceiro/:parceiroId` - Contatos por parceiro
- `GET /api/cobranca/titulos/:nuFin/contatos` - Contatos vinculados a título
- `PUT /api/cobranca/contatos/:id/situacao` - Atualizar situação
- `PUT /api/cobranca/contatos/:id/concluir` - Marcar como concluído
- `PUT /api/cobranca/contatos/:id/pendente` - Marcar como pendente

Veja exemplos detalhados em `EXEMPLOS_USO.md`
Estrutura tabelas em `ESTRUTURA_TABELAS.md`

## 🔧 Configuração

### Backend (.env)

`.env` em `backend/`:

```env
PORT=3001
NODE_ENV=development

# Gateway Sankhya
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

## 🎯 Benefícios da Separação

### Backend Separado
- ✅ Foco API + lógica negócio
- ✅ Múltiplos frontends
- ✅ Escalabilidade independente
- ✅ Deploy separado
- ✅ Testes isolados

### Frontend Separado
- ✅ Dev independente
- ✅ Qualquer framework
- ✅ Deploy em CDNs
- ✅ UX otimizada
- ✅ Cache + performance

### Comunicação
- ✅ API REST bem definida
- ✅ Contrato estável via DTOs
- ✅ Documentação completa
- ✅ Fácil integração

## 📚 Documentação

- **README.md** - Visão geral projeto
- **EXEMPLOS_USO.md** - Exemplos uso API
- **IMPLEMENTACAO.md** - Detalhes técnicos implementação
- **SANKHYA_API_GUIDE.md** - Guia integração Sankhya
- **ESTRUTURA_TABELAS.md** - Estrutura tabelas TGFTEL + TGFFIN
- **ESTRUTURA.md** - Este arquivo - Estrutura diretórios

## 🚀 Próximos Passos

### Backend
- [ ] Implementar sistema filas (BullMQ)
- [ ] Adicionar cache Redis
- [ ] Criar agendador automático
- [ ] Implementar autenticação
- [ ] Adicionar testes

### Frontend
- [ ] Escolher framework (React/Vue/Angular)
- [ ] Criar estrutura projeto
- [ ] Implementar dashboard
- [ ] Criar telas gestão títulos
- [ ] Implementar sistema cobranças
- [ ] Adicionar autenticação

## 🎓 Conclusão

Separação backend/frontend permite:
- Dev paralelo
- Escalabilidade independente
- Flexibilidade tecnológica
- Manutenção simplificada
- Equipes especializadas

---

**Status**: ✅ **Backend Funcional** | ⏳ **Frontend Em Desenvolvimento**  
**Data**: 04/08/2026  
**Versão**: 1.0.0
