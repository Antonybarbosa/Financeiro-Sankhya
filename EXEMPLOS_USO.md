# Exemplos de Uso do Sistema de Cobrança

## 1. Verificar Status do Sistema

```bash
curl http://localhost:3001/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2026-08-04T16:30:00.000Z",
  "service": "financeiro-sankhya"
}
```

## 2. Obter Dashboard KPIs

```bash
curl http://localhost:3001/api/cobranca/dashboard/kpis
```

**Resposta esperada:**
```json
{
  "totalTitulos": 150,
  "totalVencidos": 45,
  "totalA_vencer": 25,
  "totalBaixados": 0,
  "valorEmAberto": 125000.50,
  "valorVencido": 45000.00,
  "valorA_vencer": 30000.00,
  "valorBaixado": 0,
  "cobrancasPendentes": 0,
  "cobrancasEnviadas": 0,
  "cobrancasFalhas": 0,
  "contatosPendentes": 0
}
```

## 3. Listar Títulos em Aberto (TGFFIN)

```bash
curl http://localhost:3001/api/cobranca/titulos
```

**Resposta esperada:**
```json
[
  {
    "id": 1234,
    "nuNota": 5678,
    "numero": "168",
    "numeroDupl": 100001,
    "serie": "1",
    "desdobramento": "A",
    "clienteId": 720,
    "clienteNome": "SHOP RURAL",
    "empresa": 1,
    "valor": 1500.00,
    "valorBaixado": 0,
    "valorDesconto": 0,
    "valorJuros": 0,
    "valorMulta": 0,
    "valorEmAberto": 1500.00,
    "dataVencimento": "2026-08-10T00:00:00.000Z",
    "dataEmissao": "2026-08-01T00:00:00.000Z",
    "dataBaixa": null,
    "recDesp": 1,
    "status": "PENDENTE",
    "historico": "Venda de produtos",
    "nossoNumero": "00012345678",
    "codigoBarras": null,
    "linhaDigitavel": null,
    "isVencido": false,
    "isEmAberto": true,
    "diasParaVencimento": 6,
    "diasVencido": 0
  }
]
```

## 4. Buscar Títulos Vencidos

```bash
# Vencidos nos últimos 30 dias
curl "http://localhost:3001/api/cobranca/titulos/vencidos?diasAtrasoMin=0&diasAtrasoMax=30"

# Todos os vencidos
curl http://localhost:3001/api/cobranca/titulos/vencidos
```

## 5. Buscar Títulos a Vencer

```bash
# Próximos 7 dias (padrão)
curl http://localhost:3001/api/cobranca/titulos/a-vencer

# Próximos 15 dias
curl http://localhost:3001/api/cobranca/titulos/a-vencer?dias=15
```

## 6. Buscar Título Específico

```bash
# Buscar por NUFIN (PK de TGFFIN)
curl http://localhost:3001/api/cobranca/titulos/1234
```

## 7. Buscar Títulos por Cliente

```bash
curl http://localhost:3001/api/cobranca/titulos/cliente/720
```

## 8. Buscar com Filtros Avançados

### Por Status
```bash
curl "http://localhost:3001/api/cobranca/titulos?status=PENDENTE"
```

### Por Cliente
```bash
curl "http://localhost:3001/api/cobranca/titulos?clienteId=720"
```

### Por Período
```bash
curl "http://localhost:3001/api/cobranca/titulos?dataInicio=2026-07-01&dataFim=2026-08-31"
```

### Por Dias de Vencimento
```bash
# Vencidos há 30 dias
curl "http://localhost:3001/api/cobranca/titulos?diasVencimento=-30"

# A vencer em 15 dias
curl "http://localhost:3001/api/cobranca/titulos?diasVencimento=15"
```

## 9. Criar Cobrança

```bash
curl -X POST http://localhost:3001/api/cobranca/cobrancas \
  -H "Content-Type: application/json" \
  -d '{
    "tituloId": 1234,
    "tipo": "EMAIL",
    "dataAgendamento": "2026-08-05T10:00:00Z",
    "mensagem": "Prezado cliente, informamos que seu título no valor de R$ 1.500,00 vence em 5 dias.",
    "destinatario": "cliente@email.com"
  }'
```

**Resposta esperada:**
```json
{
  "id": "cob-1722808200000-abc123def",
  "tituloId": 1234,
  "tipo": "EMAIL",
  "status": "PENDENTE",
  "dataAgendamento": "2026-08-05T10:00:00.000Z",
  "dataEnvio": null,
  "mensagem": "Prezado cliente, informamos que seu título no valor de R$ 1.500,00 vence em 5 dias.",
  "destinatario": "cliente@email.com",
  "tentativas": 0,
  "ultimoErro": null
}
```

## 10. Listar Cobranças Pendentes de Envio

```bash
curl http://localhost:3001/api/cobranca/cobrancas?tipo=pendentes
```

## 11. Listar Cobranças Falhadas

```bash
curl http://localhost:3001/api/cobranca/cobrancas?tipo=falhas
```

## 12. Buscar Cobrança Específica

```bash
curl http://localhost:3001/api/cobranca/cobrancas/cob-1722808200000-abc123def
```

## 13. Buscar Cobranças por Título

```bash
curl http://localhost:3001/api/cobranca/titulos/1234/cobrancas
```

## 14. Atualizar Status da Cobrança

```bash
curl -X PUT http://localhost:3001/api/cobranca/cobrancas/cob-1722808200000-abc123def \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ENVIADA",
    "dataEnvio": "2026-08-05T10:05:00.000Z"
  }'
```

## 15. Marcar Cobrança como Entregue

```bash
curl -X PUT http://localhost:3001/api/cobranca/cobrancas/cob-1722808200000-abc123def/entregue
```

## 16. Atualizar Status do Título

```bash
curl -X PUT http://localhost:3001/api/cobranca/titulos/1234/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PAGO"
  }'
```

## 17. Registrar Contato / Chamada (TGFTEL)

```bash
curl -X POST http://localhost:3001/api/cobranca/contatos \
  -H "Content-Type: application/json" \
  -d '{
    "parceiroId": 720,
    "tipo": "WHATSAPP",
    "comentarios": "Cliente informou que vai pagar amanhã",
    "mensagem": "Lembrete de pagamento - Título 168",
    "proximaChamada": "2026-08-06T10:00:00Z",
    "situacao": "PENDENTE",
    "pendente": true,
    "nuFin": 1234
  }'
```

**Resposta esperada:**
```json
{
  "id": 5001,
  "parceiroId": 720,
  "parceiroNome": "SHOP RURAL",
  "dataChamada": "2026-08-04T17:30:00.000Z",
  "proximaChamada": "2026-08-06T10:00:00.000Z",
  "tipo": "WHATSAPP",
  "historico": null,
  "comentarios": "Cliente informou que vai pagar amanhã",
  "comentarios2": null,
  "mensagem": "Lembrete de pagamento - Título 168",
  "pendente": true,
  "situacao": "PENDENTE",
  "usuarioId": 0,
  "usuarioNome": null,
  "atendenteId": 0,
  "atendenteNome": null,
  "vendedorId": null,
  "nuFin": 1234,
  "dataAlteracao": "2026-08-04T17:30:00.000Z"
}
```

## 18. Listar Contatos

```bash
# Contatos pendentes
curl "http://localhost:3001/api/cobranca/contatos?pendentes=true"

# Próximas chamadas (7 dias)
curl "http://localhost:3001/api/cobranca/contatos?proximas=7"

# Por tipo
curl "http://localhost:3001/api/cobranca/contatos?tipo=WHATSAPP"

# Por situação
curl "http://localhost:3001/api/cobranca/contatos?situacao=PENDENTE"
```

## 19. Buscar Contatos por Parceiro

```bash
curl http://localhost:3001/api/cobranca/contatos/parceiro/720
```

## 20. Buscar Contatos por Título (NUFIN)

```bash
curl http://localhost:3001/api/cobranca/titulos/1234/contatos
```

## 21. Concluir Contato

```bash
curl -X PUT http://localhost:3001/api/cobranca/contatos/5001/concluir
```

## 21b. Marcar Contato como Pendente

```bash
curl -X PUT http://localhost:3001/api/cobranca/contatos/5001/pendente
```

## 22. Atualizar Situação do Contato

```bash
curl -X PUT http://localhost:3001/api/cobranca/contatos/5001/situacao \
  -H "Content-Type: application/json" \
  -d '{"situacao": "CONCLUIDO"}'
```

## Fluxo Completo de Cobrança

### 1. Identificar Títulos Vencidos
```bash
curl http://localhost:3001/api/cobranca/titulos/vencidos?dias=1
```

### 2. Criar Cobrança para Título Vencido
```bash
curl -X POST http://localhost:3001/api/cobranca/cobrancas \
  -H "Content-Type: application/json" \
  -d '{
    "tituloId": 1234,
    "tipo": "EMAIL",
    "dataAgendamento": "2026-08-04T17:00:00Z",
    "mensagem": "Seu título venceu ontem. Por favor, regularize.",
    "destinatario": "cliente@email.com"
  }'
```

### 3. Monitorar Status da Cobrança
```bash
curl http://localhost:3001/api/cobranca/cobrancas/cob-1722808200000-abc123def
```

### 4. Marcar como Entregue (após confirmação)
```bash
curl -X PUT http://localhost:3001/api/cobranca/cobrancas/cob-1722808200000-abc123def/entregue
```

### 5. Atualizar Título (após pagamento)
```bash
curl -X PUT http://localhost:3001/api/cobranca/titulos/1234/status \
  -H "Content-Type: application/json" \
  -d '{"status": "PAGO"}'
```

## Tipos de Cobrança Disponíveis

- `EMAIL` - Envio por email
- `SMS` - Envio por SMS
- `WHATSAPP` - Envio por WhatsApp
- `BOLETO` - Geração boleto bancário

## Tipos de Contato (TGFTEL)

- `TELEFONE` - Ligação telefônica
- `WHATSAPP` - Mensagem via WhatsApp
- `EMAIL` - E-mail
- `BOLETO` - Envio boleto
- `SMS` - SMS
- `OUTRO` - Outro tipo

## Situações de Contato

- `PENDENTE` - Aguardando atendimento
- `EM_ANDAMENTO` - Em andamento
- `CONCLUIDO` - Concluído
- `CANCELADO` - Cancelado

## Status de Título (TGFFIN)

- `PENDENTE` - A vencer (em aberto, não vencido)
- `VENCIDO` - Vencido (em aberto, após vencimento)
- `PAGO` - Pago integralmente
- `BAIXADO` - Baixado (pago/recebido)
- `BAIXA_PARCIAL` - Baixa parcial (valor baixado < valor original)
- `CANCELADO` - Cancelado
- `NEGOCIADO` - Renegociado

> **Nota:** Status derivado dos campos `DHBAIXA`, `DTVENC`, `VLRBAIXA` da TGFFIN.

## Status de Cobrança

- `PENDENTE` - Aguardando envio
- `ENVIADA` - Enviada com sucesso
- `ENTREGUE` - Entregue ao destinatário
- `FALHOU` - Falha envio
- `CANCELADA` - Cobrança cancelada

## Dicas de Uso

1. **Monitore Dashboard** regularmente pra KPIs
2. **Use filtros** pra buscar títulos específicos
3. **Agende cobranças** cedo pra melhores resultados
4. **Monitore falhas** + configure retentativas automáticas
5. **Atualize status** títulos após pagamento pra manter dados atualizados

## Integração com Frontend

Sistema fornece API REST completa integrável com qualquer frontend (React, Vue, Angular). Use endpoints acima pra criar dashboards, listas títulos + formulários cobrança.
