# API CRUD Cliente - Documentação Técnica

## Visão Geral

API REST para CRUD de clientes (TGFPAR/TGFCTT) do sistema Financeiro Sankhya. Endpoints em `/api/clientes`.

- **Validação ponta a ponta:** Sessão 22 (`backend/scripts/test-update-all-fields.ts` — 65 PASS/0 FAIL; `test-e2e-http-endereco.ts` — 12/12 PASS)
- **Autenticação:** JWT Bearer em todos os endpoints

---

## Endpoints Disponíveis

### 1. Listar Clientes
**Endpoint:** `GET /api/clientes`

**Query Params:**
- `nome` (opcional): busca parcial em nome, razão social e CNPJ/CPF (dígitos, se ≥3)
- `cnpjCpf` (opcional): filtra por CNPJ/CPF (busca parcial, dígitos)
- `situacao` (opcional): classificação de crédito (`P`,`R`,`B`,`O`,`E`)
- `ativo` (opcional): `S` ou `N`
- `page` (opcional, default 1)
- `limit` (opcional, default 50, máx 100)

**Resposta (200 OK):**
```json
{
  "clientes": [
    {
      "codParc": 123,
      "nomeParc": "Nome da Empresa Ltda",
      "razaoSocial": "Nome da Empresa Ltda",
      "cnpjCpf": "12345678000190",
      "tipoPessoa": "J",
      "situacao": "B",
      "ativo": true,
      "telefone": "81999998888",
      "email": "contato@empresa.com",
      "inscricaoEstadual": "123456789",
      "prazoPag": 30,
      "limiteCredito": 5000.0,
      "observacoes": null,
      "endereco": {
        "codEnd": 317631, "codBai": 26, "codCid": 266,
        "logradouro": "RUA DO HOSPICIO", "numero": "123",
        "complemento": "SALA 1", "bairro": "SANTO ANTONIO",
        "cidade": "RECIFE", "uf": "PE", "cep": "50050900"
      },
      "enderecoEntrega": { "...": "mesma forma + nomeContato" },
      "latitude": "-8.047562", "longitude": "-34.877002",
      "dataCadastro": "2024-01-15T10:30:00.000Z",
      "dataUltimaAlteracao": "2026-08-21T12:52:26.000Z"
    }
  ],
  "total": 15352, "page": 1, "limit": 50, "totalPages": 308
}
```

**Exemplo:** `GET /api/clientes?nome=empresa&ativo=S&page=1&limit=50`

---

### 2. Contar Clientes
**Endpoint:** `GET /api/clientes/count`

**Resposta:** `{ "total": 15352 }`

---

### 3. Buscar por CNPJ/CPF
**Endpoint:** `GET /api/clientes/buscar/cnpj/:cnpjCpf` (busca parcial, com ou sem formatação)

---

### 4. Validar Documento
**Endpoint:** `GET /api/clientes/validar-documento/:cnpjCpf?codParc=123`

Consulta `ParceiroSP.verificaExistenciaCpfInscEstRepetido` (fallback SQL). Resposta: `{ "existe": true, "mensagem": "..." }`

---

### 5. Buscar por ID
**Endpoint:** `GET /api/clientes/:codParc`

Retorna o objeto completo do cliente (mesma forma da listagem). `404` se não existir.

---

### 6. Criar Cliente
**Endpoint:** `POST /api/clientes`

**Campos Obrigatórios:** `nomeParc`, `tipoPessoa` (`F`/`J`), `cnpjCpf` (14 dígitos J / 11 F, dígito verificador válido), `endereco.codCid` **ou** `endereco.cidade` existente no Sankhya (trigger `TRG_INC_TGFPAR` exige CODCID > 0).

**Request Body (exemplo completo):**
```json
{
  "nomeParc": "Nome da Empresa Ltda",
  "razaoSocial": "Nome da Empresa Ltda",
  "cnpjCpf": "12.345.678/0001-90",
  "tipoPessoa": "J",
  "telefone": "(81) 99999-8888",
  "email": "contato@empresa.com",
  "inscricaoEstadual": "123456789",
  "prazoPag": 30,
  "limiteCredito": 5000,
  "descBonif": "L",
  "descFin": 2.75,
  "endereco": {
    "codCid": 266, "cidade": "RECIFE", "uf": "PE",
    "bairro": "SANTO ANTONIO", "logradouro": "RUA DO HOSPICIO",
    "numero": "123", "complemento": "SALA 1", "cep": "50050-900"
  }
}
```

**Erros:** `400` validação (nome/CNPJ/cidade), `409` CNPJ/CPF já cadastrado.

---

### 7. Atualizar Cliente
**Endpoint:** `PUT /api/clientes/:codParc`

Todos os campos são opcionais — apenas os informados (e não-nulos) são atualizados. `null` é **ignorado** (nunca serializado como string).

**Campos aceitos (Sessão 20–22):**

| Grupo | Campos |
|---|---|
| Dados gerais | `nomeParc`, `razaoSocial`, `cnpjCpf`, `tipoPessoa`, `situacao` (P/R/B/O/E), `telefone`, `email`, `inscricaoEstadual`, `observacoes` |
| Financeiro & Crédito | `prazoPag` (int), `limiteCredito`, `limiteCreditoMensal`, `qtdMaxTitVencidos`, `codTab`, `codVend`, `codBco`, `descBonif` (**string L/J/S/P**), `descFin` (decimal) |
| Fiscal | `inscricaoMunicipal`, `classificacaoIcms`, `retemIss`, `retemInss`, `retemPis`, `retemCofins`, `retemCsl` (S/N) |
| Dicionário | `simples`, `perfilEconect`, `tipoFatur`, `regimeEspTribIss`, `tipoClienteServCom` |
| Customizados AD_* | `adCredCli`, `adLimitePar`, `adLocalCad`, `adCodBcoBol` |
| Entrega/GPS | `emailNotifEntrega`, `entregaEndContato`, `exigContatoEntCab` (S/N), `latitude`, `longitude` (string) |
| Endereço principal | `endereco: { codEnd?, codBai?, codCid?, logradouro?, numero?, complemento?, bairro?, cidade?, uf?, cep? }` |
| Endereço de entrega | `enderecoEntrega: { ...mesmos + nomeContato? }` — grava TGFCTT (CODCONTATO=1) |

**Erros:** `404` não existe, `400` validação, `409` CNPJ/CPF de outro parceiro.

---

### 8. Deletar Cliente (inativação)
**Endpoint:** `DELETE /api/clientes/:codParc`

Soft delete: grava `ATIVO='N'` na TGFPAR.

**Resposta:** `{ "mensagem": "Cliente inativado com sucesso (ATIVO=N)" }`

---

## Endpoints de Apoio

| Endpoint | Retorno (máx 20; bancos 40) |
|---|---|
| `GET /api/clientes/enderecos/cidades?query=RECIF` | `[{ "codCid": 266, "nomeCidade": "RECIFE", "uf": "PE" }]` |
| `GET /api/clientes/enderecos/bairros?query=SANTO%20ANTONIO` | `[{ "codBai": 26, "nomeBairro": "SANTO ANTONIO" }]` |
| `GET /api/clientes/enderecos/logradouros?query=RUA%20DO%20HOSPICIO` | `[{ "codEnd": 123, "nomeEnd": "RUA DO HOSPICIO" }]` |
| `GET /api/clientes/bancos?query=ITAU` | `[{ "codBco": 1, "nomeBco": "ITAU" }]` |

---

## Códigos de Status HTTP

| Código | Descrição |
|--------|-----------|
| 200/201 | OK / Criado |
| 400 | Erro de validação (DTO/`@IsIn`/negócio) |
| 401 | Sem/invalid token JWT |
| 404 | Cliente não encontrado |
| 409 | CNPJ/CPF duplicado |
| 500 | Erro no servidor/Sankhya |

---

## Campos e Tipos (domínios)

### Tipo de Pessoa: `F` Física / `J` Jurídica

### Situação (classificação de crédito — constraint `CKC_SITUACAO_TGFPAR`)
| Código | Descrição |
|--------|-----------|
| `E` | Excelente |
| `O` | Ótima |
| `B` | Boa (padrão da base) |
| `R` | Regular |
| `P` | Péssima |

**Status real de ativo/inativo = campo `ativo` (booleano; coluna `ATIVO` S/N).** `situacao` é nullable.

### Desconto Bonificado (`descBonif` — VARCHAR2(1), constraint `IN ('L','J','S','P')`)
| Código | Descrição |
|--------|-----------|
| `L` | Livre |
| `J` | Na Nota/Pedido |
| `S` | Em separado |
| `P` | Proibido |

---

## Considerações Importantes

1. **Autenticação:** JWT Bearer obrigatório em todos os endpoints
2. **Inativação:** DELETE grava `ATIVO='N'`; `SITUACAO` é classificação de crédito
3. **Telefone:** gravado apenas dígitos (coluna largura 13)
4. **CNPJ/CPF:** máscara removida antes de validar/gravar; listener do Sankhya valida dígito verificador
5. **Cidade obrigatória no create** (trigger); create usa `DatasetSP.save` com `pk={CODPARC:''}`
6. **FKs de endereço:** `codCid`/`codBai`/`codEnd` gravam código direto; nomes são fallback por **match exato** (case/acento-insensitive — `JOAO`=`JOÃO`). Sem match: no endereço principal a FK é ignorada; **na entrega a FK atual é preservada** (nunca zerada/trocada por aproximação)
7. **`null` no update:** ignorado em todos os campos (nunca vira string "null")
8. **GPS:** `latitude`/`longitude` gravados em `DatasetSP.save` separado do save principal (payloads grandes podiam descartá-los sem erro — transiente observado em teste real)
9. **Datas de auditoria:** todo update grava `DTALTER` (TGFPAR) e `DHALTER` (TGFCTT) com data/hora do salvamento
10. **Paginação:** server-side (ROWNUM aninhado, limit máx 100) + count paralelo

---

## Scripts de Validação (regressão reexecutável)

| Script | O que faz |
|---|---|
| `backend/scripts/test-update-all-fields.ts` | Altera TODOS os campos do cliente de teste (CNPJ 11.222.333/0001-81) e verifica coluna a coluna via SQL direto; valida DTALTER/DHALTER, troca CNPJ↔CPF, duplicidade 409, inativação (65 checks) |
| `backend/scripts/test-e2e-http-endereco.ts` | E2E HTTP real (app Nest + JWT + PUT): fluxo busca-CEP→form→save; valida FK exata, preservação de FKs não resolvidas, TGFCTT (12 checks) |
| `backend/scripts/probe-null-guard.ts` | Update com campos `null` — confirma que nulos são ignorados |
