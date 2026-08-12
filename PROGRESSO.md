# Registro de Progresso - Financeiro Sankhya

> Última atualização: 11/08/2026

---

## Sessão 19 — Remoção de Histórico, Botão DANFE condicional, Dados Completos do Parceiro, e Botão "Ver Dados" em todas as Views

> 4 mudanças encadeadas: remoção de feature não usada, DANFE só quando XML existe, expansão de dados cadastrais do parceiro, e botão reutilizável padronizado em todas as views de atendimento.

### 19.1. Remoção: Seção "Histórico de Contatos" do ParceiroDetailPanel

**Motivo:** Seção pouco usada; removida para simplificar o painel.

**Arquivo:** `frontend/components/cobranca/ParceiroDetailPanel.tsx`

**Removido:**
- JSX completo da seção (título + lista + botões Finalizar/Marcar pendente)
- Hooks não usados: `useContatosPorParceiro`, `useConcluirContato`, `useMarcarPendenteContato`
- Estados: `atendimentoEmAcao`, `atendimentoErro`
- Função `executarAcaoAtendimento`
- Configs `tipoContatoConfig` e `situacaoContatoConfig`
- Imports não usados: `History`, `CheckCircle2`, `RotateCcw`, `AlertTriangle`, `formatDateTime`

**Estado final do Panel:** header + actions rápidas + totais + lista de títulos + viewers (DANFE/Boleto/Renegociação).

---

### 19.2. Botão DANFE Condicional (`hasNfe`)

**Problema:** Botão DANFE aparecia sempre que `titulo.numero` (NUMNOTA) tinha valor, mas clicar podia falhar com 404 se a NFE não existisse em `TGFNFE` ou se o XML fosse vazio.

**Solução:** Backend adiciona flag `hasNfe` booleano em cada título via subquery `EXISTS`.

#### 19.2.1. Constante SQL reutilizável

`backend/src/infrastructure/repositories/sankhya-titulo.repository.ts`:
```typescript
const NFE_EXISTS = `CASE WHEN EXISTS (
  SELECT 1 FROM TGFNFE NFE
  WHERE NFE.NUNOTA = FIN.NUNOTA
    AND NFE.XML IS NOT NULL
    AND DBMS_LOB.GETLENGTH(NFE.XML) > 0
) THEN 1 ELSE 0 END AS HAS_NFE`;
```

Adicionada em **8 queries** que alimentam `mapQueryToTitulo`: `findById`, `findByCliente`, `findVencidos`, `findA_vencer`, `findEmAberto`, `findPorStatus`, `findPorPeriodo`, `findBaixadosPorPeriodo`.

#### 19.2.2. Fluxo da flag

| Camada | Arquivo | Mudança |
|---|---|---|
| Entity | `titulo.entity.ts` | Campo `hasNfe?: boolean` + `create()` atualizado |
| Repository | `sankhya-titulo.repository.ts` | `mapQueryToTitulo()` mapeia `data.HAS_NFE` |
| Use-case | `titulo.use-cases.ts` | `mapToResponseDto()` passa `hasNfe` |
| DTO | `cobranca.dto.ts` | `TituloResponseDto` + campo |
| Frontend type | `types/cobranca.ts` | `Titulo` + campo |
| Component | `ParceiroDetailPanel.tsx:207` | Condição: `{titulo.hasNfe && titulo.numero && (...)}` |

---

### 19.3. Busca de Dados Completos do Parceiro

**Objetivo:** Trazer endereço completo + dados fiscais do parceiro na lista de atendimentos e na fila de cobrança, **sem** usar a tela nativa `Parceiro.xhtml5` (que exige `mgeSession` e retorna HTML).

**Decisão arquitetural:** SQL extension com JOINs (mesmo padrão de `findBoleto`), usando OAuth já em uso.

#### 19.3.1. Campos adicionados

**Fiscais** (todos de `TGFPAR`):
- `RAZAOSOCIAL`, `NOMEFANTASIA`, `TIPO`, `PESSOFISJUR` (F/J), `INSCREST`

**Endereço** (`TGFPAR` + 3 JOINs):
- `PAR.NUMEND`, `PAR.COMPLEMENTO`, `PAR.CEP`
- `TSIEND.NOMEEND` (logradouro via `PAR.CODEND`)
- `TSIBAI.NOMEBAI` (bairro via `PAR.CODBAI`) — **ver 19.3.3 abaixo**
- `TSICID.NOMECID` + `TSICID.UF` (cidade/UF via `PAR.CODCID`)

#### 19.3.2. Queries estendidas

**`findAtendimentosHoje`** — `sankhya-contato.repository.ts:131`:
```sql
-- ANTES: só NOMEPARC, TELEFONE, EMAIL, CGC_CPF
-- DEPOIS: + 9 colunas TGFPAR + 3 LEFT JOINs
LEFT JOIN TSIEND ENDP ON ENDP.CODEND = PAR.CODEND
LEFT JOIN TSIBAI BAI ON BAI.CODBAI = PAR.CODBAI
LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID
```

**`findFilaCobranca`** — `sankhya-titulo.repository.ts:312`:
- Adicionados `MAX(PAR.RAZAOSOCIAL)`, `MAX(PAR.NOMEFANTASIA)`, etc. no `GROUP BY FIN.CODPARC`
- Adicionados os mesmos 3 LEFT JOINs

#### 19.3.3. Bug corrigido: bairro não está em `TGFPAR`

**Erro:** `ORA-00904: "PAR"."BAIRRO": identificador inválido`

**Causa:** `TGFPAR` não tem coluna `BAIRRO`. Bairro é FK → `TSIBAI` (tabela auxiliar).

**Fix:** JOIN em `TSIBAI`:
```sql
LEFT JOIN TSIBAI BAI ON BAI.CODBAI = PAR.CODBAI
-- Projeta: BAI.NOMEBAI AS BAIRRO
```

Estrutura confirmada via script de exploração:
- `TSIBAI` existe com colunas: `CODBAI`, `NOMEBAI`, `CODREG`, `DTALTER`, `DESCRICAOCORREIO`, `NUVERSAU`, `ATUNUVERSAO`
- `TGFPAR.CODBAI` é FK → `TSIBAI.CODBAI`
- Não existe `TGFTBAI`, `TGFBAI`, `TGFEND` (todas retornaram ORA-00942)

#### 19.3.4. Fluxo dos novos campos

| Camada | Arquivo | Mudança |
|---|---|---|
| Interface domain | `contato.repository.interface.ts` | `AtendimentoHojeRow` +11 campos |
| Repository | `sankhya-contato.repository.ts` | SQL + map da row |
| DTO | `cobranca.dto.ts` | `AtendimentoHojeItemDto` +11 opcionais |
| Use-case | `contato.use-cases.ts:118` | Propaga row → DTO |
| Interface domain | `titulo.repository.interface.ts` | `FilaItem` +11 opcionais |
| Repository | `sankhya-titulo.repository.ts` | SQL + map do row |
| Frontend type | `types/cobranca.ts` | `AtendimentoHojeItem` + `FilaItem` +11 campos |
| Utils | `lib/utils.ts` | Adicionado `formatCep()` |

---

### 19.4. Componente `ParceiroDadosExtras` (reutilizável)

**Motivação:** Inicialmente o botão "Ver dados do parceiro" foi embutido no `ParceiroCard` (usado só em `MasterDetailView`). Kanban e Table tinham cards próprios, sem o recurso. Extraído para componente reutilizável.

**Arquivo novo:** `frontend/components/cobranca/ParceiroDadosExtras.tsx`

**Comportamento:**
- Botão toggle "Ver dados do parceiro" com ícone `FileText` + `ChevronDown/ChevronUp`
- Bloco **Dados fiscais**: Razão Social, Fantasia, CNPJ/CPF (formatado), Insc. Estadual, Tipo (PF/PJ)
- Bloco **Endereço**: logradouro+número+complemento, bairro, cidade/UF, CEP
- Retorna `null` quando não há dados extras (componente invisível)
- Estado interno `expandido` (independente por componente)
- `stopPropagation` no botão para não disparar click do card pai

**Props:** aceita todos os 11 campos como opcionais (`razaoSocial?`, `nomeFantasia?`, `tipoPessoa?`, `pessoFisJur?`, `inscricaoEstadual?`, `cnpjCpf?`, `logradouro?`, `numeroEnd?`, `complemento?`, `cep?`, `bairro?`, `cidade?`, `uf?`).

### 19.5. Aplicação nas 3 Views

#### 19.5.1. `MasterDetailView` (Lista+Detalhe)

Usa `ParceiroCard` → componente `ParceiroDadosExtras` é renderizado dentro do card automaticamente.

**`ParceiroCard.tsx`** refatorado para:
- Usar `'razaoSocial' in item ? item.razaoSocial : undefined` para funcionar com ambos `FilaItem` e `AtendimentoHojeItem`
- Importa e renderiza `ParceiroDadosExtras` no fim do card (antes de `</div>` principal)

#### 19.5.2. `KanbanView`

**Correção importante:** botão estava **fora** do card (irmão do `<button>` principal). Movido para dentro.

**Refatoração estrutural** — `KanbanView.tsx`:
- `<button onClick={setSelected}>` → `<div role="button" tabIndex={0} onKeyDown={...}>` (para permitir `<button>` aninhado no toggle)
- `<ParceiroDadosExtras>` movido para **antes** do fechamento do card (`</div>`), após a seção `(item.telefone || item.email)`
- Handler `onKeyDown` com Enter/Espaço para acessibilidade
- Removido bloco duplicado que estava fora do card

**Estrutura final por card:**
```
<div className="space-y-1.5">          ← wrapper externo
  <div role="button" ...>              ← CARD clicável
    ...nome, valor, telefone...
    <ParceiroDadosExtras ... />        ← botão DENTRO do card
  </div>
  <div className="flex gap-1.5">       ← ações (Finalizar/Reabrir/WhatsApp/Tel)
    ...
  </div>
</div>
```

#### 19.5.3. `TableView`

- Estado `expandidoId: number | null` controla qual linha está aberta (uma por vez)
- Botão novo na última coluna (ícone `ChevronDown/ChevronUp`)
- Ao clicar, abre `<tr>` abaixo com `colSpan=8` contendo `ParceiroDadosExtras`
- Usa `Fragment` com `key={item.parceiroId}` para renderizar 2 `<tr>` por item

**Imports adicionados:** `Fragment` (React), `ChevronUp` (lucide-react), `ParceiroDadosExtras`.

### 19.6. Validação

- **Typecheck backend**: limpo (`tsc --noEmit`)
- **Typecheck frontend**: limpo
- **Bug ORA-00904 do bairro**: corrigido após descoberta via script exploratório que `TSIBAI` é a tabela correta

### 19.7. Arquivos modificados nesta sessão

**Backend:**
| Arquivo | Mudança |
|---|---|
| `backend/src/domain/entities/titulo.entity.ts` | + `hasNfe?: boolean` |
| `backend/src/application/dto/cobranca.dto.ts` | `TituloResponseDto` + `hasNfe`; `AtendimentoHojeItemDto` +11 campos; (sem mudança `FilaItem`-related pois é outra interface) |
| `backend/src/application/use-cases/titulo.use-cases.ts` | `mapToResponseDto` passa `hasNfe` |
| `backend/src/infrastructure/repositories/sankhya-titulo.repository.ts` | + `NFE_EXISTS` constante; 8 queries + campo; `mapQueryToTitulo` mapeia `HAS_NFE`; `findFilaCobranca` SQL + 3 JOINs + map |
| `backend/src/domain/repositories/titulo.repository.interface.ts` | `FilaItem` +11 campos opcionais |
| `backend/src/domain/repositories/contato.repository.interface.ts` | `AtendimentoHojeRow` +11 campos |
| `backend/src/infrastructure/repositories/sankhya-contato.repository.ts` | SQL `findAtendimentosHoje` + 3 JOINs + 9 colunas + map |
| `backend/src/application/use-cases/contato.use-cases.ts` | Propagar campos da row → DTO |

**Frontend:**
| Arquivo | Mudança |
|---|---|
| `frontend/types/cobranca.ts` | `Titulo` + `hasNfe?`; `AtendimentoHojeItem` + `FilaItem` +11 campos |
| `frontend/types/agenda.ts` | Sem mudança direta (refletida em Sessão 18) |
| `frontend/lib/utils.ts` | + `formatCep()` |
| `frontend/components/cobranca/ParceiroDadosExtras.tsx` | **NOVO** — componente reutilizável |
| `frontend/components/cobranca/ParceiroCard.tsx` | Refatorado p/ usar `ParceiroDadosExtras`; imports limpos |
| `frontend/components/cobranca/ParceiroDetailPanel.tsx` | Removida seção "Histórico de Contatos"; botão DANFE condicional `hasNfe` |
| `frontend/components/cobranca/views/KanbanView.tsx` | Card virou `<div role="button">`; `ParceiroDadosExtras` dentro |
| `frontend/components/cobranca/views/TableView.tsx` | + `expandidoId` state; botão coluna; linha expansível com `Fragment` |

### 19.8. Pendências e próximos passos sugeridos

- **Documentar `TSIBAI`/`TSIEND`/`TSICID`** em `ESTRUTURA_TABELAS.md` (atualizado só `TGFPAR`/`TGFFIN`/`TGFTEL` hoje)
- **Testar manualmente** as 3 views com atendente real para confirmar presença dos dados extras
- **Considerar** adicionar `TGFCTT` (contatos extras/telefones adicionais) caso usuário peça múltiplos contatos por parceiro
- **Performance:** `findFilaCobranca` agora com 3 JOINs extras — monitorar tempo de resposta; se lento, pode cache em nível de use-case (parceiro rarely changes)
- **Acessibilidade:** `ParceiroCard` e `KanbanView` card agora com `role="button"` — validar com leitor de tela se necessário
- **Testar botão DANFE** com título que tem `hasNfe=false` (não deve aparecer) e `hasNfe=true` (deve aparecer e abrir)
- **Limpar scripts de debug** em `backend/scripts/debug-*.ts` que referenciam `mgeSession` (fora do runtime NestJS, não usados)

### 19.9. Padrões consolidados nesta sessão

1. **Descoberta de schema Oracle:** Sempre verificar estrutura via `SELECT * FROM TABELA WHERE ROWNUM <= 1` e inspecionar `fieldsMetadata` — não assumir nomes de colunas
2. **Componente reutilizável:** Quando 3+ views precisam do mesmo recurso, extrair para componente (`ParceiroDadosExtras`) em vez de duplicar
3. **HTML válido:** `<button>` não pode conter `<button>` — trocar por `<div role="button">` quando card precisa ter botões dentro
4. **Flag EXISTS:** Para campos virtuais baseados em existência em outra tabela (como `hasNfe`), usar subquery `CASE WHEN EXISTS (...) THEN 1 ELSE 0 END` em vez de LEFT JOIN + NULL check
5. **Helper SQL:** Constantes como `NFE_EXISTS` permitem reutilização em múltiplas queries sem duplicação

---

## Sessão 18 — Paginação da Agenda e Correção ORA-01795 (limite de IN do Oracle)

> Endpoint de agenda paginado via `ROWNUM` aninhado e fix do erro `ORA-01795: o número máximo de expressões em uma lista é de 1000` em queries com `IN (lista)` dinâmico.

### 18.1. Objetivo

1. **Performance**: tela de agenda carregava loading eterno quando consulta retornava muitos registros. Implementar paginação server-side.
2. **Bug crítico**: ao adaptar agenda para usar `TGFTEL` (chamadas do atendente) + `TGFFIN` (títulos do parceiro), queries com `IN (${ids.join(',')})` quebravam com `ORA-01795` quando o atendente tinha >1000 parceiros contactados.

### 18.2. Bug ORA-01795 — Limite do Oracle em listas `IN`

#### Causa

O Oracle limita a **1000 expressões** em uma cláusula `IN (lista)`. Vários métodos do repositório construíam SQL dinâmico com `IN (${ids.join(',')})`, onde `ids` vinha de arrays de parceiros (TGFTEL) ou títulos (TGFFIN). Quando o atendente logado tinha muitos atendimentos, o array excedia 1000 → `ORA-01795: o número máximo de expressões em uma lista é de 1000`.

#### Solução: helper `chunkedIn()`

Criado `backend/src/infrastructure/sankhya/sql-utils.ts` com o helper `chunkedIn(column, ids)` que:

1. Deduplica os IDs (`new Set`).
2. Parte em chunks de no máximo 1000 itens.
3. Gera `IN (...)` simples quando ≤1000 IDs.
4. Gera múltiplos `IN (...)` unidos com `OR` quando >1000.
5. Retorna `1=0` (sempre falso) quando lista vazia — seguro em qualquer `WHERE`.

```typescript
import { chunkedIn } from '../sankhya/sql-utils';

const inClause = chunkedIn('FIN.CODPARC', parceiroIds);
const sql = `SELECT ... WHERE ${inClause}`;
```

**SQL gerado — exemplo com 1500 IDs:**
```sql
WHERE (FIN.CODPARC IN (1,2,...,1000) OR FIN.CODPARC IN (1001,...,1500))
```

**SQL gerado — exemplo com 300 IDs:**
```sql
WHERE FIN.CODPARC IN (1,2,...,300)
```

**SQL gerado — lista vazia:**
```sql
WHERE 1=0
```

#### Pontos corrigidos

| Arquivo | Método | Coluna |
|---|---|---|
| `sankhya-titulo.repository.ts` | `findResumoFinanceiroPorParceiros` | `FIN.CODPARC` |
| `sankhya-titulo.repository.ts` | `findResumoFinanceiroAgregado` | `FIN.CODPARC` |
| `sankhya-titulo.repository.ts` | `aplicarOverlayPendente` | `TEL.CODPARC` |
| `sankhya-renegociacao.repository.ts` | `buscarTemplateTitulos` | `FIN.NUFIN` |

### 18.3. Paginação da Agenda

#### Contexto

Agenda antes era uma consulta direta em `TGFFIN` filtrando por `DTVENC = hoje`, com `ROWNUM <= 500`. Com a mudança para visão orientada pelo atendente (TGFTEL), a consulta pode retornar milhares de registros (um atendente ativo pode ter contactado muitos clientes, e cada cliente ter muitos títulos em aberto).

#### Implementação

Padrão Oracle de paginação com `ROWNUM` aninhado (compatível com qualquer versão, não depende de `OFFSET/FETCH` que exige Oracle 12c+):

```sql
SELECT * FROM (
  SELECT inner_q.*, ROWNUM AS RN FROM (
    -- query real com ORDER BY aqui
    SELECT ... FROM TGFFIN ... ORDER BY FIN.DTVENC ASC
  ) inner_q
  WHERE ROWNUM <= :offset + :limit    -- limite superior
)
WHERE RN > :offset                     -- limite inferior
```

#### Mudanças por arquivo

**Backend — `backend/src/presentation/agenda/agenda.controller.ts`**
- Query agora orientada por `TGFTEL` via `EXISTS` (não JOIN) — elimina duplicação NUFIN.
- `CODATENDENTE` vem do JWT (`req.user.codusu`), não hardcoded.
- Parâmetros `?page=1&limit=50` (limit max 500).
- Query separada `COUNT + SUM` para totalizadores globais (não mudam entre páginas).
- Retorna metadata: `page`, `limit`, `total`, `totalPages`, `hasMore`, `codAtendente`.

**Frontend**
- `types/agenda.ts` — adicionado `page`, `limit`, `totalPages`, `hasMore` no `AgendaResponse`; `AgendaParams` sem `dias`.
- `hooks/useAgenda.ts` — aceita `{ page, limit }` e usa `keepPreviousData` (sem flash ao trocar página).
- `lib/api.ts` — envia `page`/`limit` como query string.
- `components/agenda/AgendaList.tsx` — estado `page` com `useState`, controles Anterior/Próximo, indicador "Página X de Y", badge sutil `isFetching` ao trocar.

#### Response shape

```json
{
  "data": [ /* Agendamento[] */ ],
  "total": 8617,
  "page": 1,
  "limit": 50,
  "totalPages": 173,
  "hasMore": true,
  "dataConsulta": "11/08/2026",
  "codAtendente": 310,
  "totalReceber": 4419551.57,
  "totalPagar": 3043159.24
}
```

### 18.4. Validação

- **Typecheck**: limpo em backend e frontend (`tsc --noEmit`).
- **Teste de paginação**: páginas 1 e 2 com `limit=5` retornaram conjuntos disjuntos (zero overlap), totalizadores consistentes entre páginas.
- **Teste ORA-01795**: endpoint que antes quebrava para atendente com >1000 parceiros agora responde 200.

### 18.5. Regras de negócio consolidadas

- Agenda = **títulos em aberto** (`DHBAIXA IS NULL`) dos **parceiros que o atendente logado contactou hoje** (`TGFTEL.CODATENDENTE = codusu` do JWT, `TRUNC(DHCHAMADA) = TRUNC(SYSDATE)`).
- Duplicação eliminada via `EXISTS` (não JOIN por CODPARC).
- `PROVISAO <> 'S'` e `VLRDESDOB > 0` mantidos como filtros de qualidade do dado.

---

## Sessão 17 — Sincronização de dados entre as 3 views (Kanban, Lista+Detalhe, Tabela)

> Kanban agora mostra valor vencido, qtd títulos/vencidos, dias atraso e contato. Tabela agora mostra badge Pendente/Resolvido do atendimento do dia.

### 17.1. Objetivo

A sessão 16 documentou enriquecimento financeiro dos cards de atendimento (Kanban e Lista+Detalhe), mas a implementação **não estava completa** no código (typecheck quebrado) e a Tabela continuava sem badge de atendimento. Esta sessão:

1. **Corrigiu bugs da sessão 16** (módulos inexistentes, métodos não implementados, args errados).
2. **Adicionou todos os dados financeiros** (`qtdTitulos`, `qtdVencidos`) aos cards do Kanban.
3. **Adicionou badge Pendente/Resolvido** às linhas da Tabela via overlay TGFTEL no backend.

### 17.2. Bugs corrigidos (Sessão 16 estava incompleta)

| Erro | Causa | Correção |
|---|---|---|
| `Cannot find module 'src/domain/repositories/auth.repository.interface'` | Caminho absoluto `src/...` não funciona no NestJS | Criado arquivo com interface `IAuthUser` em `backend/src/domain/repositories/auth.repository.interface.ts`; imports ajustados para caminho relativo `../../` |
| `Module has no exported member 'ResumoFinanceiroParceiro'` | Tipo documentado mas nunca adicionado à interface | Adicionado `ResumoFinanceiroParceiro` em `ITituloRepository` |
| `Property 'findResumoFinanceiroPorParceiros' does not exist on type 'ITituloRepository'` | Método documentado mas nunca implementado | Implementado em `SankhyaTituloRepository` com query única em `TGFFIN` agrupada por `CODPARC` |
| `Object literal may only specify known properties, and 'valorVencido' does not exist in type 'AtendimentoHojeItemDto'` | DTO não tinha os campos extras | Adicionado `valorVencido?`, `diasAtrasoMax?`, `qtdTitulos?`, `qtdVencidos?` ao DTO |
| `Expected 1 arguments, but got 0` (titulo.use-cases.ts:89) | `buscarAtendimentosHoje` exigia `usuarioLogado` mas KPIs não passa user | `usuarioLogado` agora é **opcional**; se ausente, busca todos atendimentos do dia (sem filtro `CODATENDENTE`) |
| `Expected 1 arguments, but got 2` (sankhya-contato.repository.ts:143) | `executeQuery` não suporta bind params | Refatorado para interpolação direta com `Math.floor` para segurança numérica; `filtroUsuario` vazio quando `usuarioId<=0` |
| `Property 'CODPARC' is missing in type ... but required in type 'AtendimentoHojeRow'` | Campo redundante exigido | Removido `CODPARC` da interface (já existe `parceiroId` mapeado) |
| `Expected 0 arguments, but got 1` (cobranca.controller.ts:41) | `obterKpis()` não aceita args desde sessão 13 | Removido `req.user` do controller (KPIs é global) |

### 17.3. Backend — Estensão de dados

#### 17.3.1. `AtendimentoHojeItemDto` estendido

Novos campos opcionais (populados pelo `ContatoUseCases.buscarAtendimentosHoje`):
```typescript
qtdTitulos?: number;
qtdVencidos?: number;
```

#### 17.3.2. `ResumoFinanceiroParceiro` estendido

```typescript
export interface ResumoFinanceiroParceiro {
  parceiroId: number;
  valorVencido: number;
  diasAtrasoMax: number;
  qtdTitulos: number;   // NOVO
  qtdVencidos: number;  // NOVO
}
```

#### 17.3.3. `FilaItem` estendido com `pendente`

```typescript
export interface FilaItem {
  // ... campos existentes ...
  pendente: boolean | null;  // NOVO — overlay via TGFTEL
}
```

#### 17.3.4. Implementação `findResumoFinanceiroPorParceiros`

Query única em `TGFFIN` (apenas títulos em aberto com saldo):

```sql
SELECT FIN.CODPARC,
       SUM(CASE WHEN DTVENC < TRUNC(SYSDATE)
                THEN NVL(VLRDESDOB,0) - NVL(VLRBAIXA,0) ELSE 0 END) AS VALOR_VENCIDO,
       MAX(TRUNC(SYSDATE) - DTVENC) AS DIAS_ATRASO_MAX,
       COUNT(*) AS QTD_TITULOS,
       SUM(CASE WHEN DTVENC < TRUNC(SYSDATE) THEN 1 ELSE 0 END) AS QTD_VENCIDOS
FROM TGFFIN FIN
WHERE RECDESP=1 AND PROVISAO<>'S' AND DHBAIXA IS NULL
  AND VLRDESDOB > 0 AND NVL(VLRDESDOB,0) - NVL(VLRBAIXA,0) > 0
  AND CODPARC IN (...)
GROUP BY CODPARC
```

#### 17.3.5. Overlay `pendente` no `findFilaCobranca`

Após buscar items da página, chama `aplicarOverlayPendente(items)` que executa:

```sql
SELECT CODPARC, PENDENTE FROM (
  SELECT TEL.CODPARC, TEL.PENDENTE,
         ROW_NUMBER() OVER (PARTITION BY TEL.CODPARC ORDER BY TEL.DHCHAMADA DESC) AS RN
  FROM TGFTEL TEL
  WHERE TRUNC(TEL.DHCHAMADA) = TRUNC(SYSDATE)
    AND TEL.CODPARC IN (...)
)
WHERE RN = 1
```

Pega o último atendimento do dia por parceiro e popula `item.pendente`. Best-effort: se TGFTEL falhar, mantém `null`.

### 17.4. Frontend — Tipos

```typescript
// types/cobranca.ts
export interface FilaItem {
  // ... campos existentes ...
  pendente: boolean | null;  // NOVO
}

export interface AtendimentoHojeItem {
  // ... campos existentes ...
  qtdTitulos?: number;   // NOVO
  qtdVencidos?: number;  // NOVO
}
```

### 17.5. Frontend — KanbanView reescrito

Cada card agora exibe:
- Nome + último comentário + data (mantido)
- Badge `Nx` se múltiplos atendimentos (mantido)
- **NOVO**: Linha financeira com valor vencido (R$) + qtd vencidos · qtd títulos
- **NOVO**: Label de dias em atraso (com cor por criticidade)
- **NOVO**: Linha com ícones telefone + e-mail
- Botões Finalizar/Reabrir + WhatsApp + Telefone (mantido)

Imports adicionados: `formatCurrency`, `diasAtrasoLabel`, `Mail`.

### 17.6. Frontend — TableView com nova coluna "Atend."

- Adicionada coluna **"Atend."** entre "Prioridade" e "Ações".
- Componente `StatusAtendimentoBadge` exibe:
  - `null` → `—` (sem atendimento hoje)
  - `true` → badge laranja "Pendente"
  - `false` → badge verde "Resolvido"
- `colSpan` ajustado de 7 → 8 (estado vazio).

### 17.7. Bugs pré-existentes corrigidos (Sessão 15)

| Arquivo | Bug | Correção |
|---|---|---|
| `FilaCobranca.tsx` | Passava `apenasVencidos` para `MasterDetailView` (não aceita mais desde sessão 15) | Removido prop; MasterDetailView usa `useAtendimentosHoje` sem filtro |
| `MasterDetailView.tsx` | Passava `parceiroId` sozinho para `ParceiroDetailPanel` (espera `item`) | Passa objeto `selected` completo |
| `ParceiroCard.tsx` | TS estrito reclamando de `diasAtraso`/`qtdVencidos`/`qtdTitulos` undefined | Adicionados null checks (`&&`) |

### 17.8. Estado das 3 views após sessão 17

| View | Fonte | Dados exibidos por card/linha |
|---|---|---|
| **Atendimento (Kanban)** | `useAtendimentosHoje` | nome, comentário último contato, data, badge contatos, **valor vencido, qtd vencidos/títulos, dias atraso, telefone, e-mail** |
| **Lista + Detalhe** | `useAtendimentosHoje` | (via `ParceiroCard`) badge Pendente/Resolvido, dias atraso, valor vencido, qtd vencidos, telefone/e-mail, qtd títulos |
| **Tabela** | `useFilaCobranca` | nome, cnpj, telefone (com WA), atraso + 1º vencimento, qtd títulos/vencidos, valor vencido + a vencer, prioridade, **badge Pendente/Resolvido**, ações (boleto, renegociar) |

### 17.9. Arquivos modificados

**Backend:**

| Arquivo | Ação |
|---|---|
| `backend/src/domain/repositories/auth.repository.interface.ts` | **NOVO** — `IAuthUser` |
| `backend/src/domain/repositories/titulo.repository.interface.ts` | + `ResumoFinanceiroParceiro`, + `findResumoFinanceiroPorParceiros`, + `pendente` em `FilaItem` |
| `backend/src/domain/repositories/contato.repository.interface.ts` | Removido `CODPARC` de `AtendimentoHojeRow` (redundante) |
| `backend/src/infrastructure/repositories/sankhya-titulo.repository.ts` | + import `ResumoFinanceiroParceiro`, + `findResumoFinanceiroPorParceiros()`, + `aplicarOverlayPendente()`, + `pendente: null` no map do FilaItem |
| `backend/src/infrastructure/repositories/sankhya-contato.repository.ts` | `findAtendimentosHoje` agora filtra `CODATENDENTE` só se `usuarioId > 0` |
| `backend/src/application/dto/cobranca.dto.ts` | `AtendimentoHojeItemDto` + `qtdTitulos?`, `qtdVencidos?` |
| `backend/src/application/use-cases/contato.use-cases.ts` | Import path corrigido, `buscarAtendimentosHoje` agora aceita `usuarioLogado?` opcional, mapeia `qtdTitulos`/`qtdVencidos` do resumo |
| `backend/src/presentation/cobranca/cobranca.controller.ts` | Import path corrigido, `getDashboardKpis` sem args |

**Frontend:**

| Arquivo | Ação |
|---|---|
| `frontend/types/cobranca.ts` | `FilaItem` + `pendente`, `AtendimentoHojeItem` + `qtdTitulos?`, `qtdVencidos?` |
| `frontend/components/cobranca/views/KanbanView.tsx` | Cards reescritos com bloco financeiro + atraso + ícones contato |
| `frontend/components/cobranca/views/TableView.tsx` | + coluna "Atend." com `StatusAtendimentoBadge` |
| `frontend/components/cobranca/views/MasterDetailView.tsx` | Corrigido `ParceiroDetailPanel` receber `item` em vez de `parceiroId` |
| `frontend/components/cobranca/FilaCobranca.tsx` | Removido `apenasVencidos` do `<MasterDetailView>` |
| `frontend/components/cobranca/ParceiroCard.tsx` | Null checks para fields opcionais |

### 17.10. Typecheck

- Backend: `npx tsc --noEmit` → ✅ OK
- Frontend: `npx tsc --noEmit` → ✅ OK

### 17.11. Pendências

| # | Pendência |
|---|---|
| 1 | Testar runtime (subir backend+frontend, validar dados reais em produção) |
| 2 | Avaliar se `pendente: null` na Tabela deve ser exibido como "—" ou oculto (decisão UX) |
| 3 | `ContatoForm.tsx` órfão da sessão 13 ainda presente (decidir deletar) |
| 4 | Auth guard ainda não implementado — `req.user` não é populado em runtime; KPIs funciona (sem filtro), mas `GET /atendimento/hoje` do Kanban precisa de `req.user.id` real para filtrar por operador |

### 17.12. Continuação — Cards sincronizados com a lista de atendimento

> Os cards do dashboard (Em Aberto, Vencidos, A Vencer 7d, Resolvidos Hoje) agora agregam **sempre** da agenda de atendimento do operador (TGFTEL), independente da view ativa.

**Antes:** Cards puxavam `/dashboard/kpis` (global TGFFIN, todos os títulos). Não batiam com o que o operador via na lista de atendimento.

**Depois:** Cards puxam do mesmo endpoint `/atendimento/hoje` que alimenta o Kanban/Lista+Detalhe. Tudo sincronizado com a agenda do dia.

#### Backend — KPIs agregados no endpoint `/atendimento/hoje`

Novo tipo `ResumoFinanceiroAgregado`:

```typescript
export interface ResumoFinanceiroAgregado {
  valorEmAberto: number;     // soma (VLRDESDOB - VLRBAIXA) de todos títulos em aberto dos parceiros
  valorVencido: number;      // soma dos títulos com DTVENC < SYSDATE
  valorAvencer7d: number;    // soma dos títulos com DTVENC entre SYSDATE e SYSDATE+7
  qtdTitulos: number;
  qtdVencidos: number;
  qtdAvencer7d: number;
}
```

Implementado em `SankhyaTituloRepository.findResumoFinanceiroAgregado(parceiroIds)` — query única agregando todos os parceiros da agenda.

`AtendimentoHojeResponseDto` ganhou campo `kpis: AtendimentoHojeKpisDto`. O `ContatoUseCases.buscarAtendimentosHoje` agora chama `findResumoFinanceiroAgregado` após agregar os items por parceiro.

#### Frontend — DashboardCards refatorado

- Novo hook `useKpisAtendimento` extrai KPIs + pendentes/resolvidos do endpoint `/atendimento/hoje` (mesma fonte do Kanban).
- `DashboardCards` reescrito para usar `useKpisAtendimento` (não mais `useKpis`).
- Card "Baixados" trocado por **"Resolvidos Hoje"** com qtd `X de Y` (faz mais sentido no contexto da agenda — títulos baixados não estão em cobrança).

Mapeamento cards:

| Card | Fonte (KPIs agenda) |
|---|---|
| Em Aberto | `valorEmAberto` + `qtdTitulos` |
| Vencidos | `valorVencido` + `qtdVencidos` |
| A Vencer (7d) | `valorAvencer7d` + `qtdAvencer7d` |
| Resolvidos Hoje | `resolvidos` de `total` + `pendentes` pendentes |

#### Typecheck
- Backend: `npx tsc --noEmit` → ✅ OK
- Frontend: `npx tsc --noEmit` → ✅ OK

#### Pendências adicionais

| # | Pendência |
|---|---|
| 5 | Filtros clicáveis dos cards (vencidos/avencer/total) só afetam a TableView; nas views Kanban/Lista+Detalhe o clique é visualmente ativo mas sem efeito. Decidir se ao clicar troca automaticamente para a view Tabela |
| 6 | ✅ Resolvido na 17.13 (AuthGuard implementado) |

### 17.13. AuthGuard com JWT — `req.user` populado, filtro por operador ativo

> Implementado sistema de autenticação JWT completo. Agora o endpoint `/atendimento/hoje` **filtra corretamente pelo operador logado**.

#### Antes
- `cobranca.controller.ts` declarava `@Req() req: { user: IAuthUser }` mas **nenhuma guard populava** `req.user`
- Em runtime: `req.user = undefined` → `usuarioId = 0` → query sem filtro `CODATENDENTE`
- Todos operadores viam todos os atendimentos do dia
- Frontend não enviava token de autorização nas chamadas

#### Depois
- Login assina **JWT próprio** com `{ codusu, username }`, valida com secret do `.env`
- `AuthGuard` global decodifica JWT de todo header `Authorization: Bearer <token>` → popula `req.user`
- Rotas públicas (`/login`, `/logout`, `/validate`, `/health`) marcadas com `@Public()`
- Frontend interceptor axios envia Bearer token em TODAS as chamadas + trata 401 → logout automático
- `/atendimento/hoje` agora filtra `WHERE TEL.CODATENDENTE = :codusu`

#### Fluxo completo

```
[LoginForm] POST /api/auth/sankhya-login { username, password }
   ↓ backend decodifica idusu Base64 → codusu
   ↓ backend assina JWT { codusu, username } com JWT_SECRET (8h expiração)
   ↓ retorna { appToken, codusu, username, callID, jsessionid }
[Frontend] user.token = appToken  (JWT, não jsessionid)
   ↓ store em localStorage
[Qualquer chamada] interceptor axios injeta Authorization: Bearer <jwt>
   ↓
[Backend] AuthGuard decodifica JWT
   ↓ req.user = { id: codusu, codusu, login: username }
   ↓
[Endpoint /atendimento/hoje] ContatoUseCases.buscarAtendimentosHoje(req.user)
   ↓ usuarioId = req.user.codusu
   ↓ query: WHERE TRUNC(DHCHAMADA) = TRUNC(SYSDATE) AND CODATENDENTE = :codusu
   ↓ retorna apenas atendimentos do operador logado
```

#### Arquivos

**Backend:**

| Arquivo | Ação |
|---|---|
| `backend/.env` | + `JWT_SECRET`, `JWT_EXPIRES_IN=8h` |
| `backend/package.json` | + `jsonwebtoken`, `@nestjs/jwt`, `-D @types/jsonwebtoken` |
| `backend/src/domain/repositories/auth.repository.interface.ts` | `IAuthUser` agora `{ id: number; codusu: number; nome?; login? }` |
| `backend/src/presentation/auth/public.decorator.ts` | **NOVO** — `@Public()` decorator |
| `backend/src/presentation/auth/auth.guard.ts` | **NOVO** — `AuthGuard` CanActivate, decodifica JWT |
| `backend/src/presentation/auth/auth.module.ts` | Importa `JwtModule.register({ global: true, secret })` |
| `backend/src/presentation/auth/auth.controller.ts` | `sankhyaLogin` agora decodifica codusu no backend + assina JWT; rotas marcadas com `@Public()` |
| `backend/src/presentation/health/health.controller.ts` | `@Public()` aplicado |
| `backend/src/presentation/app.module.ts` | `APP_GUARD` global → `AuthGuard` |
| `backend/src/application/use-cases/contato.use-cases.ts` | `buscarAtendimentosHoje` usa `usuarioLogado?.codusu` (fallback `id`) |
| `backend/src/presentation/cobranca/cobranca.controller.ts` | Removido `req.user` de `getDashboardKpis` (KPIs agenda não precisa de arg) |

**Frontend:**

| Arquivo | Ação |
|---|---|
| `frontend/types/auth.ts` | `SankhyaLoginResponse` + `appToken?`, `codusu?`, `username?` |
| `frontend/lib/api.ts` | + Interceptor axios request (Bearer token) + response (401 → logout + redirect /login); `authApi.login` usa `appToken`; `validateSession` sem args |

#### Typecheck

- Backend: `npx tsc --noEmit` → ✅ OK
- Frontend: `npx tsc --noEmit` → ✅ OK

#### Pendências adicionais

| # | Pendência |
|---|---|
| 7 | Testar login + fluxo protegido em runtime (precisa fazer login novamente — token antigo do localStorage é jsessionid, será rejeitado pelo guard com 401 → redirect /login automático) |
| 8 | `JWT_SECRET` está hardcoded como fallback no código; em produção garantir que `.env` tem secret forte (não vazio) |
| 9 | Logout não invalida JWT no servidor (stateless). Considerar blacklist se necessário para revogação imediata |

### 17.14. Botão Finalizar/Reabrir no ParceiroCard (Lista + Detalhes)

> Cada card da aba "Lista + Detalhes" agora tem botões de ação diretos, sem precisar abrir o painel de detalhe.

**Antes:** Para finalizar ou reabrir um atendimento era preciso selecionar o card, abrir o painel de detalhe e usar o botão ali.

**Depois:** O `ParceiroCard` exibe botões inline:

| Estado do card | Botão exibido |
|---|---|
| Pendente | **Finalizar** (verde, com `CheckCircle2`) |
| Resolvido | **Reabrir** (laranja, com `RotateCcw`) |
| Telefone cadastrado | **WhatsApp** + **Telefone** |

**Refatoração estrutural:** O `ParceiroCard` era um `<button>` HTML (não pode aninhar outros botões). Refatorado para `<div role="button">` com `onClick` + `tabIndex`, permitindo botões filhos com `stopPropagation`.

**Props adicionadas:**
```typescript
onConcluir?: (nurel: number) => void;
onReabrir?: (nurel: number) => void;
```

O `MasterDetailView` passou `concluirContato.mutate` e `marcarPendenteContato.mutate` como handlers. As mutations invalidam o cache e a lista atualiza automaticamente.

### 17.15. Campo de busca persistente durante loading (TableView)

> O campo de busca não desaparece mais quando a tabela está carregando.

**Antes:** O `if (isLoading) return <spinner>` substituía a tela inteira, incluindo o campo de busca. Ao trocar de aba ou digitar na busca, o campo sumia e reaparecia.

**Depois:** A estrutura da tabela (cabeçalho + colunas) sempre renderiza. Durante o load, apenas o `<tbody>` exibe o spinner em uma única linha com `colSpan={8}`. O campo de busca e o cabeçalho da tabela permanecem estáticos.

O contador ao lado da busca também foi ajustado: mostra `"Buscando..."` durante o loading em vez do número de itens.

### 17.16. Paginação client-side nas listas (20 itens + "Carregar mais")

> As listas agora carregam apenas 20 itens por vez, com botão para expandir. Resolve problema de performance com muitas atendimentos.

**Antes:** Todas as views renderizavam todos os itens de uma vez. Com muitos atendimentos agendados, a tela ficava pesada.

**Depois:**

| View | Mecanismo | Constante |
|---|---|---|
| **Lista + Detalhes** | 20 itens visíveis + botão "Carregar mais (N restantes)" | `PAGE_SIZE = 20` |
| **Kanban** | 20 por coluna + botão "Carregar mais" independente por coluna | `PAGE_SIZE = 20` via `limitPorColuna` |
| **Tabela** | Já tinha infinite scroll (20/página via backend) | mantido |

**Implementação Lista + Detalhes:**
- Estado `limit` (default 20), incrementado em `PAGE_SIZE` a cada clique.
- `visiveis = filtrados.slice(0, limit)`.
- `temMais = filtrados.length > limit` controla visibilidade do botão.
- Ao digitar na busca, `limit` reseta para `PAGE_SIZE` (evita mostrar "fantasmas" de páginas antigas).

**Implementação Kanban:**
- Estado `limitPorColuna: Record<string, number>` — cada coluna (pendentes/resolvidos) tem seu próprio limite independente.
- Botão "Carregar mais" aparece no fim de cada coluna quando há mais itens.

### 17.17. Typecheck final

- Backend: `npx tsc --noEmit` → ✅ OK
- Frontend: `npx tsc --noEmit` → ✅ OK

### 17.18. Resumo consolidado da Sessão 17

| # | Melhoria | Impacto |
|---|---|---|
| 1 | Bugs da sessão 16 corrigidos | Backend voltou a compilar |
| 2 | Dados financeiros sincronizados nas 3 views | Kanban, Lista+Detalhe e Tabela agora mostram as mesmas informações (valor, qtd, atraso, badge) |
| 3 | Cards do dashboard agregados da agenda | KPIs (Em Aberto, Vencidos, A Vencer) refletem o que o operador está trabalhando, não o banco global |
| 4 | AuthGuard JWT implementado | `req.user` populado, `/atendimento/hoje` filtra por `CODATENDENTE` do operador logado |
| 5 | Interceptor axios no frontend | Todas as chamadas enviam `Authorization: Bearer`, 401 → logout automático |
| 6 | Botão Finalizar/Reabrir nos cards | Ação direta sem abrir painel de detalhe |
| 7 | Campo de busca persistente | TableView não perde o input durante loading |
| 8 | Paginação 20 itens + Carregar mais | Performance: listas não travam com muitos atendimentos |

### 17.19. Arquivos modificados na sessão 17 (consolidado)

**Backend (13 arquivos):**

| Arquivo | Ação |
|---|---|
| `backend/.env` | + `JWT_SECRET`, `JWT_EXPIRES_IN=8h` |
| `backend/package.json` | + `jsonwebtoken`, `@nestjs/jwt`, `-D @types/jsonwebtoken` |
| `backend/src/domain/repositories/auth.repository.interface.ts` | **Reescrito** — `IAuthUser` com `codusu` |
| `backend/src/domain/repositories/titulo.repository.interface.ts` | + `ResumoFinanceiroParceiro`, `ResumoFinanceiroAgregado`, `findResumoFinanceiroPorParceiros`, `findResumoFinanceiroAgregado`, `pendente` em `FilaItem` |
| `backend/src/domain/repositories/contato.repository.interface.ts` | Removido `CODPARC` redundante de `AtendimentoHojeRow` |
| `backend/src/infrastructure/repositories/sankhya-titulo.repository.ts` | + `findResumoFinanceiroPorParceiros`, `findResumoFinanceiroAgregado`, `aplicarOverlayPendente`, `pendente: null` no FilaItem |
| `backend/src/infrastructure/repositories/sankhya-contato.repository.ts` | `findAtendimentosHoje` filtra `CODATENDENTE` só se `usuarioId > 0` |
| `backend/src/application/dto/cobranca.dto.ts` | `AtendimentoHojeItemDto` + `qtdTitulos?`, `qtdVencidos?`; **NOVO** `AtendimentoHojeKpisDto`; `AtendimentoHojeResponseDto` + `kpis` |
| `backend/src/application/use-cases/contato.use-cases.ts` | `buscarAtendimentosHoje` opcional, usa `codusu`, chama `findResumoFinanceiroPorParceiros` e `findResumoFinanceiroAgregado` |
| `backend/src/presentation/auth/public.decorator.ts` | **NOVO** — `@Public()` |
| `backend/src/presentation/auth/auth.guard.ts` | **NOVO** — `AuthGuard` com JWT |
| `backend/src/presentation/auth/auth.module.ts` | Importa `JwtModule.register({ global: true })` |
| `backend/src/presentation/auth/auth.controller.ts` | Login assina JWT, rotas `@Public()` |
| `backend/src/presentation/health/health.controller.ts` | `@Public()` |
| `backend/src/presentation/app.module.ts` | `APP_GUARD` global → `AuthGuard` |
| `backend/src/presentation/cobranca/cobranca.controller.ts` | Import corrigido, KPIs sem args, `/atendimento/hoje` repassa `req.user` |

**Frontend (8 arquivos):**

| Arquivo | Ação |
|---|---|
| `frontend/types/auth.ts` | `SankhyaLoginResponse` + `appToken`, `codusu`, `username` |
| `frontend/types/cobranca.ts` | `FilaItem` + `pendente`, `AtendimentoHojeItem` + `qtdTitulos/qtdVencidos`, **NOVO** `AtendimentoHojeKpis`, `AtendimentoHojeResponse` + `kpis` |
| `frontend/lib/api.ts` | + Interceptor request (Bearer) + response (401→logout), `authApi.login` usa `appToken`, `validateSession` sem args |
| `frontend/hooks/useCobranca.ts` | **NOVO** `useKpisAtendimento` hook |
| `frontend/components/cobranca/DashboardCards.tsx` | **Reescrito** — usa `useKpisAtendimento`, card "Baixados" → "Resolvidos Hoje" |
| `frontend/components/cobranca/ParceiroCard.tsx` | **Reescrito** — `<div>` em vez de `<button>`, + Finalizar/Reabrir/WhatsApp/Telefone inline |
| `frontend/components/cobranca/views/KanbanView.tsx` | **Reescrito** — dados financeiros nos cards + paginação 20/coluna |
| `frontend/components/cobranca/views/MasterDetailView.tsx` | + handlers concluir/reabrir, paginação 20 itens |
| `frontend/components/cobranca/views/TableView.tsx` | + coluna "Atend.", `StatusAtendimentoBadge`, busca persistente durante loading, estrutura tabela sempre renderiza |
| `frontend/components/cobranca/FilaCobranca.tsx` | Removido `apenasVencidos` do `<MasterDetailView>` (bug pré-existente) |

### 17.20. Pendências finais

| # | Pendência |
|---|---|
| 1 | Testar runtime completo (login → KPIs → Kanban → Lista → Tabela → Finalizar → Paginação) |
| 2 | Filtros clicáveis dos cards (vencidos/avencer/total) só afetam a TableView; nas views Kanban/Lista+Detalhe o clique é visualmente ativo mas sem efeito |
| 3 | `JWT_SECRET` hardcoded como fallback no código — garantir `.env` forte em produção |
| 4 | Logout não invalida JWT no servidor (stateless) — considerar blacklist se necessário |
| 5 | `ContatoForm.tsx` órfão da sessão 13 ainda presente (decidir deletar) |

---

## Sessão 16 — Exibir Dias em Atraso no Card de Atendimento

> O card de atendimento (Kanban e Lista) agora exibe o resumo financeiro do parceiro, incluindo o valor total vencido e os dias em atraso do título mais antigo.

### 16.1. Objetivo

As telas de atendimento são alimentadas pela agenda do dia (TGFTEL), que não possui dados financeiros. Para dar mais contexto ao operador, o objetivo é buscar o resumo financeiro de cada parceiro na agenda e exibi-lo no card, unificando a informação visual com a da Fila de Cobrança geral.

### 16.2. Backend — Enriquecimento de Dados Financeiros

A lógica foi centralizada no `ContatoUseCases` para enriquecer os dados de atendimento com informações de `TGFFIN`.

| Arquivo | Ação |
|---|---|
| `backend/src/domain/repositories/titulo.repository.interface.ts` | Adicionada a interface `ResumoFinanceiroParceiro` e o método `findResumoFinanceiroPorParceiros(parceiroIds: number[])`. |
| `backend/src/infrastructure/repositories/sankhya-titulo.repository.ts` | Implementado o novo método `findResumoFinanceiroPorParceiros`. Ele executa uma única query otimizada em `TGFFIN` que agrupa por `CODPARC` e calcula `SUM(VLRDESDOB - VLRBAIXA)` e `MAX(TRUNC(SYSDATE) - DTVENC)` para uma lista de parceiros, evitando múltiplas chamadas ao banco. |
| `backend/src/application/use-cases/contato.use-cases.ts` | O `ContatoUseCases` agora injeta `ITituloRepository`. O método `buscarAtendimentosHoje` foi modificado: 1. Busca os atendimentos (`TGFTEL`). 2. Extrai os IDs dos parceiros. 3. Chama `tituloRepository.findResumoFinanceiroPorParceiros` para obter os dados financeiros. 4. Faz o merge dos dados financeiros nos itens de atendimento antes de retorná-los. |
| `backend/src/application/dto/cobranca.dto.ts` | O `AtendimentoHojeItemDto` foi estendido para incluir os campos opcionais `valorVencido?: number` e `diasAtrasoMax?: number`. |

### 16.3. Frontend — Adaptação do `ParceiroCard`

O componente do card foi ajustado para exibir os novos dados.

| Arquivo | Ação |
|---|---|
| `frontend/types/cobranca.ts` | O tipo `AtendimentoHojeItem` foi atualizado para incluir `valorVencido` e `diasAtrasoMax`. |
| `frontend/components/cobranca/ParceiroCard.tsx` | O componente agora verifica se o `item` recebido (que pode ser `FilaItem` ou `AtendimentoHojeItem`) possui as propriedades `valorVencido` e `diasAtrasoMax`. Se existirem, ele renderiza o valor e a label de dias em atraso, exatamente como fazia na Fila de Cobrança. A label de "Prioridade" foi removida para dar lugar à informação de atraso, que é mais direta. |

### 16.4. Resultado

Agora, ao visualizar o Kanban ou a Lista de Atendimentos, cada card de parceiro exibe claramente o valor total que ele deve e há quantos dias o título mais antigo está vencido. Isso fornece um contexto crucial para o operador de cobrança sem que ele precise sair da tela de atendimento.

**Exemplo de Card Atualizado:**

```
---------------------------------
| [Nome do Parceiro]    [Vencido há 35 dias]
|
| R$ 1.250,50
| 2 vencidos
|________________________________
| [📞 Telefone] [✉️ E-mail]
---------------------------------
```

---

## Sessão 15 — Unificação da Fonte de Dados para Telas de Atendimento

> A visão "Lista + Detalhe" agora utiliza a mesma fonte de dados da visão "Atendimento" (Kanban), garantindo consistência e foco na agenda do dia.

### 15.1. Objetivo

Anteriormente, a visão "Atendimento" (Kanban) era alimentada pela agenda do dia (`TGFTEL`), enquanto a "Lista + Detalhe" era alimentada pela fila geral de cobrança (`TGFFIN`). O objetivo é fazer com que ambas as visões de atendimento reflitam a mesma informação: a agenda de contatos do dia do operador logado.

### 15.2. Frontend — `MasterDetailView` agora usa `useAtendimentosHoje`

A principal alteração foi na fonte de dados da visão de lista.

| Arquivo | Ação |
|---|---|
| `frontend/components/cobranca/views/MasterDetailView.tsx` | Substituído o uso do hook `useFilaCobranca` pelo `useAtendimentosHoje`. A lógica de `infinite scroll` foi removida, pois `useAtendimentosHoje` retorna a lista completa de atendimentos do dia, que geralmente é pequena e não requer paginação. |
| `frontend/components/cobranca/ParceiroCard.tsx` | O componente foi adaptado para receber um `AtendimentoHojeItem` em vez de um `FilaItem`. Agora, em vez de exibir dados financeiros como "Valor Vencido", o card exibe informações do atendimento, como "Total de Contatos Hoje" e um badge indicando se o atendimento está "Pendente" ou "Resolvido". |
| `frontend/components/cobranca/FilaCobranca.tsx` | A barra de busca textual e os filtros rápidos foram desabilitados quando a visão "Lista + Detalhe" está ativa, pois a fonte de dados (`useAtendimentosHoje`) não suporta filtragem via API. A lista agora é renderizada e filtrada localmente no frontend. |

### 15.3. Resultado

Ao alternar entre as visões "Atendimento" (Kanban) e "Lista + Detalhe", o usuário agora vê exatamente os mesmos parceiros, na mesma ordem de prioridade (pendentes primeiro). A experiência de atendimento se torna unificada, com o operador sempre focado em sua agenda do dia, independentemente da visualização escolhida. A visão "Tabela" continua utilizando a fonte de dados `TGFFIN` para exploração e análise completa dos títulos financeiros.

**Fluxo do Operador Atualizado:**
1.  Acessa `/cobranca`, que abre na visão "Atendimento" (Kanban).
2.  Vê seus cards de atendimento do dia.
3.  Se mudar para a visão "Lista + Detalhe", vê a mesma lista de parceiros, com os mesmos status, mas em formato de lista vertical.
4.  O painel de detalhes (`ParceiroDetailPanel`) continua funcionando da mesma forma em ambas as visões, exibindo os títulos e o histórico do parceiro selecionado.

### 15.4. Arquivos Modificados

| Arquivo | Ação |
|---|---|
| `frontend/components/cobranca/views/MasterDetailView.tsx` | Alteração da fonte de dados e remoção do infinite scroll. |
| `frontend/components/cobranca/ParceiroCard.tsx` | Adaptação para exibir dados do `AtendimentoHojeItem`. |
| `frontend/components/cobranca/FilaCobranca.tsx` | Lógica para desabilitar busca e filtros na visão de lista. |
| `PROGRESSO.md` | Documentação desta sessão. |

---

## Sessão 14 — Filtro de Atendimentos por Usuário Logado

---

## Sessão 14 — Filtro de Atendimentos por Usuário Logado

> O Kanban de Atendimento do Dia agora filtra os registros da TGFTEL para exibir apenas os que pertencem ao `CODATENDENTE` do usuário logado.

### 14.1. Objetivo

Até agora, a tela de atendimento (`/cobranca`) mostrava todos os atendimentos do dia, de todos os operadores. A meta é fazer com que cada usuário veja apenas a sua própria agenda de trabalho.

### 14.2. Backend — Filtro por `CODATENDENTE`

A camada de dados foi ajustada para receber o código do usuário logado e aplicá-lo na consulta SQL.

| Arquivo | Ação |
|---|---|
| `backend/src/domain/repositories/contato.repository.interface.ts` | A interface `IContatoRepository` e seu método `findAtendimentosHoje` agora aceitam um parâmetro `codUsuarioLogado: number`. |
| `backend/src/infrastructure/repositories/sankhya-contato.repository.ts` | A implementação de `findAtendimentosHoje` agora adiciona a cláusula `AND TEL.CODATENDENTE = :codUsuarioLogado` na query SQL, passando o parâmetro para o `executeQuery`. |
| `backend/src/application/use-cases/contato.use-cases.ts` | O caso de uso `buscarAtendimentosHoje` recebe o `codUsuarioLogado` e o repassa para o repositório. |
| `backend/src/presentation/cobranca/cobranca.controller.ts` | O controller do endpoint `GET /atendimento/hoje` foi atualizado para extrair o `id` do usuário do objeto `req.user` (injetado por um `AuthGuard`) e passá-lo para o caso de uso. |

### 14.3. SQL Atualizado

A query em `sankhya-contato.repository.ts` agora é:

```sql
SELECT TEL.NUREL, TEL.CODPARC, PAR.NOMEPARC, PAR.TELEFONE, PAR.EMAIL,
       PAR.CGC_CPF, TEL.DHCHAMADA, TEL.DHPROXCHAM, TEL.PENDENTE,
       TEL.SITUACAO, TEL.AD_TIPCHAMADA, TEL.AD_TIPO, TEL.AD_HISTORICO,
       TEL.AD_HISTCOBRA, TEL.COMENTARIOS, TEL.AD_MSG
FROM TGFTEL TEL
INNER JOIN TGFPAR PAR ON PAR.CODPARC = TEL.CODPARC
WHERE TRUNC(TEL.DHCHAMADA) = TRUNC(SYSDATE)
  AND TEL.CODATENDENTE = :codUsuarioLogado
ORDER BY DECODE(TEL.PENDENTE,'S',0,'N',1), TEL.DHCHAMADA ASC
```

### 14.4. Frontend

Nenhuma alteração foi necessária no frontend. Como a lógica de autenticação já está implementada, o `AuthGuard` do backend garante que o `codUsuarioLogado` correto seja usado, e a UI simplesmente renderiza os dados filtrados que recebe da API.

### 14.5. Resultado

Ao acessar a página `/cobranca`, cada operador agora vê um Kanban de atendimento personalizado, contendo apenas os contatos que foram agendados para ele no Sankhya.

---

## Sessão 13 — Agenda de Atendimento do Dia (TGFTEL-driven Kanban)

> Nova UX de atendimento baseada em TGFTEL. Kanban 2 colunas (Pendentes/Resolvidos), backend-driven.

### 13.0. Decisão arquitetural — Sankhya cria TGFTEL, app só lê + atualiza PENDENTE

Modelo anterior tinha `ContatoForm` no painel pra criar registros via `save()`, mas o `save()` estava bugado (PK `NUREL=0`, dropa campos). O usuário esclareceu: **Sankhya cria os registros TGFTEL** (via tela nativa/agenda). App **só lê** e **atualiza `PENDENTE` S/N** (finalizar/reabrir).

Isso simplifica tudo: sem `save()`, sem INSERT, sem `ContatoForm`. Fonte única da agenda do dia = `TGFTEL WHERE TRUNC(DHCHAMADA) = TRUNC(SYSDATE)`.

### 13.1. Backend — `findAtendimentosHoje()`

SQL direto em TGFTEL + join TGFPAR (telefone/email/cnpj sem segundo fetch):

```sql
SELECT TEL.NUREL, TEL.CODPARC, PAR.NOMEPARC, PAR.TELEFONE, PAR.EMAIL,
       PAR.CGC_CPF, TEL.DHCHAMADA, TEL.DHPROXCHAM, TEL.PENDENTE,
       TEL.SITUACAO, TEL.AD_TIPCHAMADA, TEL.AD_TIPO, TEL.AD_HISTORICO,
       TEL.AD_HISTCOBRA, TEL.COMENTARIOS, TEL.AD_MSG
FROM TGFTEL TEL
INNER JOIN TGFPAR PAR ON PAR.CODPARC = TEL.CODPARC
WHERE TRUNC(TEL.DHCHAMADA) = TRUNC(SYSDATE)
ORDER BY DECODE(TEL.PENDENTE,'S',0,'N',1), TEL.DHCHAMADA ASC
```

- Retorna `AtendimentoHojeRow[]` (interface nova em `contato.repository.interface.ts`)
- Ordenação: pendentes primeiro, mais antigo primeiro dentro de cada grupo

### 13.2. Backend — use case `buscarAtendimentosHoje()`

Agrega por `CODPARC` (1 parceiro = 1 item na agenda):

```ts
AtendimentoHojeItemDto {
  parceiroId, parceiroNome, telefone, email, cnpjCpf,
  pendente: boolean,     // do último TGFTEL hoje
  nurel: number,          // NUREL do último contato hoje (pra mutations)
  totalContatos: number,  // qtd TGFTEL hoje p/ este parceiro
  ultimoContato: ContatoResponseDto,
}
```

Retorno: `{ items, total, pendentes, resolvidos }`.

### 13.3. Backend — Endpoint

```
GET /api/cobranca/atendimento/hoje → AtendimentoHojeResponseDto
```

### 13.4. Backend — KPI corrigido

`TituloUseCases.obterKpis()` agora chama `contatoUseCases.buscarAtendimentosHoje()` em paralelo. `DashboardKpisDto` ganhou:
- `contatosPendentes` (era hardcoded `0`)
- `atendidosHoje` (novo)
- `totalAtendimentosHoje` (novo)

`TituloUseCases` ganha injeção de `ContatoUseCases` no construtor.

### 13.5. Frontend — KanbanView reescrito (backend-driven)

| Antes (local state) | Depois (backend) |
|---|---|
| 3 colunas: A Contatar / Em Andamento / Contatado Hoje | 2 colunas: **Pendentes** / **Resolvidos** |
| `useState<Set>` movia cards (resetava no refresh) | `useAtendimentosHoje()` 30s refresh, TGFTEL real |
| "Concluir" no card só atualizava state local | "Finalizar" chama `PUT /contatos/:id/concluir` → invalida `atendimento/hoje` → card move sozinho |
| Fonte: `useFilaCobranca` (TGFFIN) | Fonte: `useAtendimentosHoje` (TGFTEL hoje) |

Botões inline no card: Finalizar/Reabrir + WhatsApp + Ligar. Clique no card abre `ParceiroDetailPanel`.

### 13.6. Frontend — ProgressAtendimentos (barra de progresso)

Novo componente no `FilaCobranca.tsx` (só visível na view kanban):
```
[████████████░░░░░░░░] Atendimentos de hoje
Resolvidos 8 · Pendentes 12 · 40%
```
Dados de `useAtendimentosHoje()`. Fill animado com gradient verde.

### 13.7. Frontend — Default view = kanban

Toggle renomeado: "Atendimento" / "Lista + Detalhe" / "Tabela". Default agora é kanban (era master-detail). Master-detail e tabela continuam pra exploração TGFFIN.

### 13.8. Frontend — ParceiroDetailPanel limpo

| Mudança | Razão |
|---|---|
| `ContatoForm` removido | Sankhya cria TGFTEL; app não cria |
| Interface flexível (`ParceiroPanelData \| FilaItem`) | Aceita AtendimentoHojeItem (sem dados financeiros) e FilaItem (completos) |
| Resumo financeiro condicional (`temFinanceiro`) | AtendimentoItem não tem valorTotal/valorVencido |
| Badges de atraso/qtdTitulos condicionais | Mesmo motivo |
| Mutations Finalizar/Marcar pendente mantidos | Continuam chamando `useConcluirContato`/`useMarcarPendenteContato` |
| Invalidação estendida | Ambos mutations agora invalidam `['cobranca','atendimento','hoje']` |

### 13.9. Fluxo do operador

```
/cobranca abre no Kanban (default)
  ↓ vê coluna Pendentes (laranja) | Resolvidos (verde)
  ↓ barra de progresso no topo: resolvidos/total · %
  ↓ clica card → painel abre (títulos TGFFIN, histórico TGFTEL, botões WA/Tel/Email)
  ↓ OU clica "Finalizar" direto no card → PUT /contatos/:id/concluir → PENDENTE='N'
  ↓ invalidação React Query → card move Pendentes→Resolvidos automaticamente
  ↓ próximo
```

### 13.10. Arquivos

| Arquivo | Ação |
|---|---|
| `backend/src/domain/repositories/contato.repository.interface.ts` | + `AtendimentoHojeRow` interface, + `findAtendimentosHoje()` |
| `backend/src/infrastructure/repositories/sankhya-contato.repository.ts` | + `findAtendimentosHoje()` impl (SQL TGFTEL+TGFPAR) |
| `backend/src/application/use-cases/contato.use-cases.ts` | + `buscarAtendimentosHoje()`, + helpers `rowToContatoResponse`/`mapTipoFromRow`/`mapSituacaoFromRow` |
| `backend/src/application/use-cases/titulo.use-cases.ts` | Injeção `ContatoUseCases`, KPI real (`contatosPendentes`/`atendidosHoje`/`totalAtendimentosHoje`) |
| `backend/src/application/dto/cobranca.dto.ts` | + `AtendimentoHojeItemDto`, + `AtendimentoHojeResponseDto`, `DashboardKpisDto` +3 campos |
| `backend/src/presentation/cobranca/cobranca.controller.ts` | + `GET /atendimento/hoje`, import DTO |
| `frontend/types/cobranca.ts` | + `AtendimentoHojeItem`, + `AtendimentoHojeResponse`, `DashboardKpis` +3 campos |
| `frontend/lib/api.ts` | + `getAtendimentosHoje()` |
| `frontend/hooks/useCobranca.ts` | + `useAtendimentosHoje()` (30s), invalidação `atendimento/hoje` em concluir/pendente |
| `frontend/components/cobranca/views/KanbanView.tsx` | Reescrito total (TGFTEL-driven, 2 colunas, botões inline) |
| `frontend/components/cobranca/FilaCobranca.tsx` | + `ProgressAtendimentos`, default kanban, toggle renomeado |
| `frontend/components/cobranca/ParceiroDetailPanel.tsx` | Remove ContatoForm, interface flexível, resumo condicional, remove imports mortos |

### 13.11. Typecheck

- Backend: `npx tsc --noEmit` → OK
- Frontend: `npx tsc --noEmit` → OK

### 13.12. Pendências

| # | Pendência |
|---|---|
| 1 | Testar runtime (subir backend+frontend, ver kanban com TGFTEL real) |
| 2 | `ContatoForm.tsx` órfão (não importado mais) — decidir se deleta ou mantém |
| 3 | Master-detail/tabela continuam TGFFIN — eventualmente receber overlay `statusAtendimento` via EXISTS TGFTEL (decidido não fazer agora) |
| 4 | `ContatoForm.tsx` órfão — confirmado sem imports externos (grep: só auto-referência). Seguro deletar ou arquivar |
| 5 | ESLint quebrado no ambiente (`Cannot find module './utils/lazy-loading-rule-map'`) — não relacionado ao código desta sessão |

### 13.13. Bugs/gaps conhecidos (herdados, não tratados nesta sessão)

- `save()` em `sankhya-contato.repository.ts` ainda bugado (NUREL=0, dropa campos) — irrelevante pois app não cria mais TGFTEL, mas endpoint `POST /contatos` ainda exposto
- `nuFin` aceito no DTO/entidade mas nunca persistido nem lido (hardcoded `null` no map)
- `proximas=0` vira `7` no controller (`||` fallback)
- `GET /contatos` sem filtro retorna `[]` (sem default "list all")

---

## Sessão 12 — Visualização de Boletos (BoletoViewer + modelo Bradesco)

> Referência técnica completa: [`BOLETO.md`](./BOLETO.md)

### 12.0. Resumo

Implementada a visualização do **boleto de cada título** num popup, replicando o layout nativo de impressão do Sankhya. Na última rodada o layout foi **reescrito do zero** usando o modelo `Boleto_Bradesco.jrxml` fornecido pelo usuário (substituindo a versão baseada no `boleto_modelo.jrxml`).

### 12.1. Fluxo

```
Painel do parceiro / Tabela → botão boleto → useBoleto(tituloId)
→ GET /api/cobranca/titulos/:id/boleto
→ SankhyaTituloRepository.findBoleto()  (TGFFIN + TGFPAR + TSIEND/TSICID + TSIEMP + TSICTA)
→ BoletoViewer (popup) → BoletoDocumento (Recibo do Sacado + Corte aqui + Ficha)
→ impressão via renderToStaticMarkup
```

### 12.2. Descobertas-chave (extraídas do jrxml via Python/ElementTree)

- **O modelo Bradesco é diferente do antigo:** título "RECIBO DO SACADO" (não "RECIBO DO PAGADOR"), tudo **SansSerif** (não Times), **sem mini-resumo**, sem coluna CIP, célula **Esp.Doc. sem borda** (não há retângulo no jrxml), bloco do pagador em **caixa única** com "Sacador/Avalista", linha digitável só na ficha.
- **Colunas do relatório:** principal 430px + totais 95px (≈ **81,9% / 18,1%**) — a grade alinhada à caixa de Instruções.
- **Nosso Número do Bradesco NÃO corta o prefixo:** `NOSSONUM[:-1]-DV` (ex.: `09/00000010909-9`); o modelo antigo cortava `substring(3)`. ⚠️ **Decisão pendente com o usuário** (ver 12.4).
- **Agência/Conta** = `CTA.CODAGE + "/" + CTA.CODCTABENEF`; no app usamos `CONVENIO` (funciona; CODCTABENEF não confirmado — pendência 7.3 do BOLETO.md).
- **Instruções do Bradesco:** multa 2% + juros `VLRDESDOB×0,075/30` por dia (em R$) + `INCLUSAO NO SPC E ENVIO AO CARTORIO NO 10º DIA DE VENCIDO.`
- **Código do banco com 2 dígitos:** Sankhya grava `33` (Santander) → `nomeBanco`/`codigoBancoDv` normalizam com `padStart(3)`.
- **Totais:** o jrxml só preenche Valor do Documento e Desconto; o app também preenche Mora/Multa e Valor Cobrado (calculados).

### 12.3. Arquivos

| Arquivo | Ação |
|---|---|
| `frontend/components/cobranca/BoletoViewer.tsx` | Reescrito — layout Bradesco completo (TopoBanco, Cell, LinhaTotais, BlocoPagador, BarcodeSvg, popup, impressão) |
| `frontend/lib/boleto.ts` | `nomeBanco`/`codigoBancoDv` com normalização de código de 2 dígitos (rodada anterior) |
| `backend/src/infrastructure/repositories/sankhya-titulo.repository.ts` | `findBoleto()` com join em TSICTA (CARTEIRA, CODAGE, CONVENIO, DIASPROT) |
| `Boleto_Bradesco.jrxml` / `boleto_modelo.jrxml` | Modelos de referência (raiz do projeto) |

### 12.4. Pendências

| # | Pendência |
|---|---|
| 1 | **Prefixo "000" do Nosso Número** — manter `09/00000010909-9` (fiel) ou voltar a cortar (`09/00010909-9`)? |
| 2 | **Logo placeholder** (iniciais do banco) — validar visual |
| 3 | Confirmar `CTA.CODCTABENEF` vs `CONVENIO` (teste antigo deu 404 por bug no script `check-tsicta2.ts`) |
| 4 | Opção de **modelo por banco** (Bradesco só p/ 237, antigo p/ demais) |
| 5 | Hardcodes do modelo: `Esp.Doc.=DM`, `Aceite=N`, Nº doc com 6 dígitos |

---

## Sessão 11 — Causa real descoberta: payload nativo do Telemarketing (não é sessão, não é SITUACAO)

### 11.0. O erro persistiu após remover SITUACAO

Mesmo gravando apenas `PENDENTE` (sem `SITUACAO`), o `DatasetSP.save` continuou falhando com `Usuário logado não tem autorização para alterar este item! (NUREL=...)` ao **finalizar** atendimento.

### 11.1. Diagnóstico (bateria de testes idempotentes — sem alterar dados)

Scripts criados em `backend/scripts/`:

| Script | Objetivo | Resultado |
|---|---|---|
| `debug-save-permissao.ts` | save idempotente (mesmo valor) em vários NURELs, sem sessão | ✅ 10/10 passam — save de `PENDENTE`/`SITUACAO` **não** é bloqueado em si |
| `debug-save-payload-app.ts` | reproduz payloads exatos do app no NUREL 710435 | `marcarConcluido` (`PENDENTE='N'`) ❌ |
| `debug-save-finalizar.ts` | transição S→N em vários NURELs (restaura p/ S) | ❌ **TODOS** bloqueados em S→N |
| `debug-finalizar-variacoes.ts` | variações de payload (`''` vazio, SITUACAO=C, standAlone, Telefone, CRUDProvider) | `''` ✅ aceito mas **ignorado**; resto ❌ |
| `debug-finalizar-native.ts` | payload nativo da tela Relacionamento + mgeSession | ✅ **aplica S→N de verdade** |
| `debug-finalizar-abc.ts` | controlado A/B/C (nativo+sessão / simples+sessão / nativo sem sessão) | **C (nativo SEM sessão) aplica** |
| `debug-finalizar-sessao-simples.ts` | payload simples + sessão | ❌ bloqueado |

### 11.2. Conclusão — o que desbloqueia é o PAYLOAD NATIVO, não a sessão

Capturamos no navegador o fetch exato da tela nativa `Relacionamento.xhtml5` finalizando (`values: {"3": "N"}`, index 3 = PENDENTE). O payload nativo inclui:

```json
{
  "serviceName": "DatasetSP.save",
  "requestBody": {
    "dataSetID": "00H",
    "entityName": "Relacionamento",
    "fields": [34 campos da tela...],
    "records": [{ "pk": { "NUREL": "..." }, "values": { "3": "N" } }],
    "crudListener": "br.com.sankhya.mgeserv.model.helpper.RelacionamentoCRUDListener",
    "txProperties": { "br.com.sankhya.mgecom.Telemarketing": true },
    "ignoreListenerMethods": "",
    "clientEventList": { "clientEvent": [{ "$": "br.com.sankhya.actionbutton.clientconfirm" }] }
  }
}
```

Teste decisivo: `debug-finalizar-native.ts` aplicou `S→N` **SEM mgeSession** no 710435 (registro que sempre falhava). O `txProperties` (Telemarketing) + `crudListener` + `dataSetID` + values indexado pela posição na lista de campos fazem o Sankhya reconhecer a operação da tela de Telemarketing e liberar a alteração para o usuário de integração.

> **Sessões 7/8/9 estavam erradas:** o mgeSession nunca foi necessário — as sessões 8/9 testaram apenas saves idempotentes (mesmo valor), que passam, e concluíram equivocadamente que a sessão/campo era a causa. O bloqueio era do **payload simples** (fields mínimo).

### 11.3. Solução implementada

| Arquivo | Ação |
|---|---|
| `infrastructure/sankhya/sankhya.gateway.ts` | Novo `saveRecordTelemarketing(pk, fields, values)` — monta o payload nativo completo (dataSetID, crudListener, txProperties Telemarketing, values indexado pela lista de 34 campos) |
| `infrastructure/repositories/sankhya-contato.repository.ts` | `save()`, `updateSituacao()`, `marcarConcluido()`, `marcarPendente()` agora usam `saveRecordTelemarketing`; `marcarConcluido` volta a gravar `PENDENTE='N'` |
| `backend/scripts/` | Scripts de diagnóstico adicionados (manter para futuras investigações) |

**Resultado final (testado via API):**
- `PUT /api/cobranca/contatos/:id/pendente` → HTTP 200, `PENDENTE='S'` aplicado ✅
- `PUT /api/cobranca/contatos/:id/concluir` → HTTP 200, `PENDENTE='N'` aplicado ✅ (sem erro de autorização, sem sessão)

---

## Sessão 10 — `save()` e `updateSituacao` alinhados ao padrão PENDENTE (S/N)

> ⚠️ Superada pela sessão 11: a conclusão de que `SITUACAO` era o problema estava incorreta (o bloqueio era do payload simples). As mudanças ficaram como parte da evolução; o padrão correto é o da sessão 11.

### 10.0. Pendência da seção 8.1 aplicada

`save()` (criar contato) e `updateSituacao` ainda gravavam o campo `SITUACAO`, o mesmo que dispara o erro `Usuário logado não tem autorização para alterar este item!` no `DatasetSP.save`. Como a tela nativa usa apenas `PENDENTE` (S/N), ambos os fluxos foram alinhados:

| Arquivo | Ação |
|---|---|
| `infrastructure/repositories/sankhya-contato.repository.ts` | `save()` agora grava **apenas `PENDENTE`** (S/N) + COMENTARIOS/AD_MSG/DHPROXCHAM — `SITUACAO` removido |
| `infrastructure/repositories/sankhya-contato.repository.ts` | `updateSituacao()` reescrito: traduz a situação para `PENDENTE` (S/N) — `PENDENTE`/`EM_ANDAMENTO` → `S`, `CONCLUIDO`/`CANCELADO` → `N` |
| `infrastructure/repositories/sankhya-contato.repository.ts` | Removido `mapSituacaoToSankhya` (sem usos após a mudança) |

> Observação: o `updateSituacao` continua no endpoint `PUT /api/cobranca/contatos/:id/situacao`, mas agora o efeito real no Sankhya é o flag `PENDENTE` — a leitura (`SITUACAO` na TGFTEL) continua refletindo o valor persistido pelo Sankhya.

---

## Sessão 7 — Correção de Autorização nas Gravações de TGFTEL (mgeSession)

### 7.0. Erro reportado

`Sankhya service error: Usuário logado não tem autorização para alterar este item!` ao gravar status de atendimento via `DatasetSP.save`.

**Causa raiz:** o Gateway executa com o usuário de **integração** (token OAuth `client_credentials`), que não tem permissão de Alterar nos registros de TGFTEL. Já a tela nativa (e os fetches capturados) roda com a sessão do **usuário logado** (`mgeSession`), que tem as permissões.

### 7.1. Solução — rodar gravações com a sessão do usuário logado

| Arquivo | Ação |
|---|---|
| `infrastructure/sankhya/sankhya.gateway.ts` | `serviceCall()` e `saveRecord()` aceitam `mgeSession?` (adicionado como query param `mgeSession` na URL, mesmo padrão da tela) |
| `domain/repositories/contato.repository.interface.ts` | Métodos de escrita aceitam `mgeSession?` |
| `infrastructure/repositories/sankhya-contato.repository.ts` | Repassa `mgeSession` ao `saveRecord` |
| `application/use-cases/contato.use-cases.ts` | Repassa `mgeSession` (criar, situacao, concluir, pendente) |
| `presentation/cobranca/cobranca.controller.ts` | Lê header `x-mge-session` e repassa |
| `frontend/lib/api.ts` | Interceptor axios envia `x-mge-session` com o `user.token` (jsessionid do `MobileLoginSP.login`) |

**Fluxo:**
```
Frontend (login) → MobileLoginSP.login → jsessionid salvo como user.token
→ toda requisição envia header x-mge-session: <jsessionid>
→ backend repassa ao serviceCall → URL ganha &mgeSession=<jsessionid>
→ DatasetSP.save roda com as permissões do usuário logado ✅
```

> **Alternativa (sem código):** liberar "Alterar" para o usuário de integração em `Configurações » Controle de Acessos` e/ou `Autorização de API` (versão 4.35+), com tipo de usuário "Integração".

---

## Sessão 9 — Decisão final: remover mgeSession (simplificação)

### 9.0. Testes decisivos

| Teste | Resultado | Conclusão |
|---|---|---|
| Script A (só OAuth, sem sessão) | ✅ | Usuário de integração consegue gravar `PENDENTE` sem sessão |
| Script B/C/D (mgeSession, cookie, callID) | ✅ | Qualquer mecanismo de sessão funciona com sessão fresca |
| Script E/F (SITUACAO, com/sem sessão) | ✅ | Campo `SITUACAO` **não** é bloqueado |
| Usuário na tela nativa do Sankhya | ✅ | O usuário tem permissão no registro |
| App com jsessionid velho do localStorage | ❌ | Sessão expirada → "Usuário logado não tem autorização" |

**Conclusão:** o erro era causado pela **sessão expirada** que o frontend enviava como `mgeSession`. Como o usuário de integração já tem permissão (teste A), a solução mais simples e robusta é **não enviar sessão nenhuma**.

### 9.1. Mudanças

| Arquivo | Ação |
|---|---|
| `infrastructure/sankhya/sankhya.gateway.ts` | Removido `mgeSession` de `serviceCall`/`saveRecord`; erro agora inclui `NUREL=` para diagnóstico |
| `domain/repositories/contato.repository.interface.ts` | Removido `mgeSession?` dos métodos de escrita |
| `infrastructure/repositories/sankhya-contato.repository.ts` | Removido `mgeSession` dos saves |
| `application/use-cases/contato.use-cases.ts` | Removido `mgeSession` |
| `presentation/cobranca/cobranca.controller.ts` | Removido header `x-mge-session` |
| `frontend/lib/api.ts` | Removido interceptor `x-mge-session` |

---

## Sessão 8 — Causa real: campo SITUACAO bloqueado (não era o usuário)

### 8.0. Diagnóstico definitivo (script `debug-contato-save.ts`)

O script testou o `DatasetSP.save` em TGFTEL (NUREL=710783) com o usuário ANTONY e o usuário de integração:

| Teste | Payload | Resultado |
|---|---|---|
| A) Só OAuth (sem sessão) | `PENDENTE` | ✅ status=1 |
| B) `mgeSession` | `PENDENTE` | ✅ status=1 |
| C) Cookie `JSESSIONID` | `PENDENTE` | ✅ status=1 |
| D) `mgeSession`=callID | `PENDENTE` | ✅ status=1 |
| E) SITUACAO+PENDENTE | `SITUACAO, PENDENTE` | ❓ (hipótese: falha) |
| F) Só SITUACAO | `SITUACAO` | ❓ (hipótese: falha) |

**Conclusão:** o usuário de integração **consegue** gravar `PENDENTE` — o erro "Usuário logado não tem autorização para alterar este item" era causado pelo campo **`SITUACAO`** (bloqueado pelo Sankhya via `DatasetSP.save`), e não pelo usuário nem pela sessão.

### 8.1. Correção

| Arquivo | Ação |
|---|---|
| `infrastructure/repositories/sankhya-contato.repository.ts` | `marcarConcluido`/`marcarPendente` agora gravam **apenas `PENDENTE`** (S/N), igual à tela nativa |

> Observação: `save()` (criar contato) e `updateSituacao` ainda gravam `SITUACAO` — se o formulário "Registrar Contato" falhar com o mesmo erro, remover `SITUACAO` desses fluxos também.

---

## Sessão 6 — Finalizar / Marcar Pendente Atendimento (TGFTEL)

### 6.0. Descoberta via tráfego real (tela Relacionamento.xhtml5)

Capturados 3 fetches da tela Telemarketing que revelam o padrão para mudar o status do atendimento:

| `values` | Campo (índice 3 = PENDENTE) | Significado |
|---|---|---|
| `{"3": ""}` | PENDENTE = vazio | Limpar status |
| `{"3": "N"}` | PENDENTE = N | **Finalizar atendimento** |
| `{"3": "S"}` | PENDENTE = S | **Marcar como pendente** |

Chave do padrão: `DatasetSP.save` com `entityName: "Relacionamento"`, `pk: { NUREL }` e `values` indexado pelo array `fields` (índice 3 = PENDENTE).

### 6.1. Backend — `marcarPendente` na cadeia de Contatos

| Arquivo | Ação |
|---|---|
| `domain/repositories/contato.repository.interface.ts` | Adicionado `marcarPendente(id)` |
| `infrastructure/repositories/sankhya-contato.repository.ts` | Adicionado `marcarPendente` (SITUACAO='P', PENDENTE='S') + constante `CONTATO_ENTITY = 'Relacionamento'` (nome da tela real) |
| `application/use-cases/contato.use-cases.ts` | Adicionado use case `marcarPendente` |
| `presentation/cobranca/cobranca.controller.ts` | Novo endpoint `PUT /api/cobranca/contatos/:id/pendente` |

### 6.2. Frontend — Ações de status no painel do parceiro

| Arquivo | Ação |
|---|---|
| `lib/api.ts` | Adicionado `marcarPendenteContato(id)` |
| `hooks/useCobranca.ts` | Novo hook `useMarcarPendenteContato` (invalida contatos + KPIs) |
| `components/cobranca/ParceiroDetailPanel.tsx` | Badge de situação por contato + botões **Finalizar** (verde) / **Marcar pendente** (laranja) com loading por linha |

O badge reflete a `situacao` (PENDENTE/EM_ANDAMENTO/CONCLUIDO/CANCELADO) e o botão muda o `PENDENTE` S/N — refletindo em tempo real na fila, KPIs e histórico após invalidação das queries.

---

## Sessão 5 — Renegociação de Títulos (Módulo mgefin)

### 5.0. Descoberta de Arquitetura — Dois Serviços Distintos

Através da análise dos payloads reais capturados no browser, descobrimos que a renegociação no Sankhya utiliza **dois serviços completamente diferentes**:

| Etapa | Serviço | Módulo | `save` | Retorno |
|---|---|---|---|---|
| **Simular** | `ParcelamentoSP.parcelar` | `mgefin` | `"N"` | `responseBody.parcelados.ROW[]` (~30 campos/parcela) |
| **Confirmar** | `RenegociacaoSP.renegociar` | `mgefin` | — | `responseBody.reneg.nroReneg` (ID da renegociação) |

**Fluxo completo:**
```
1. SIMULAR:  ParcelamentoSP.parcelar (save:N)
   → responseBody.parcelados.ROW[]     (parcelas calculadas, ~30 campos)
   → responseBody.originais.ROW        (títulos originais)

2. CONFIRMAR: RenegociacaoSP.renegociar
   → reneg.parcels.record[]            (parcels enriquecidas, ~200 campos)
   → reneg.titOrigs.titOrig[]          (NUFIN + VLRJURO + VLRMULTA)
   → reneg.prefs                       (calcDesc, manNossoNro, etc.)
   → responseBody.reneg.nroReneg       (ID da renegociação criada)
```

### 5.1. Backend — Suporte ao Módulo `mgefin` no Gateway

O `SankhyaGateway.serviceCall()` só suportava `mge` e `mgecom`. Adicionado suporte a `mgefin`:

```typescript
async serviceCall(serviceName: string, body: any, module: 'mge' | 'mgecom' | 'mgefin' = 'mge')
```

| Arquivo | Ação |
|---|---|
| `infrastructure/sankhya/sankhya.gateway.ts` | Adicionado `mgefin` como módulo válido |

---

### 5.2. Backend — Repositório de Renegociação

**`SankhyaRenegociacaoRepository`** com dois métodos principais:

#### `simular(params)` — ParcelamentoSP.parcelar (save:N)
- Monta payload `parcel` com todos os parâmetros (nroparcel, freq, venc, txjur, txmul, etc.)
- Chama `ParcelamentoSP.parcelar` no módulo `mgefin`
- Lê `responseBody.parcelados.ROW[]` (normaliza para array sempre)
- Lê `responseBody.originais.ROW`
- Retorna `{ parcelas, originais }`

#### `confirmar(dto)` — RenegociacaoSP.renegociar
Fluxo de 3 etapas:

1. **Enriquecimento via SQL** (`buscarTemplateTitulos`)
   - Busca campos-template do título original em `TGFFIN + TGFPAR`
   - Campos: NUMNOTA, SERIENOTA, CODPARC, CGC_CPF, CODEMP, CODTIPOPER, CODTIPTIT, CODNAT, CODCENCUS, CODVEND, CODBCO, NUNOTA, DHTIPOPER, DTENTSAI, etc.
   - Datas formatadas via `TO_CHAR(..., 'DD/MM/YYYY HH24:MI:SS')` (formato esperado pelo serviço)

2. **Merge de parcels** (`enriquecerParcela`)
   - Cada parcela da simulação recebe os campos do template (apenas se vazios)
   - Calcula `VLRLIQUIDO = VLRDESDOB + VLRJURO + VLRMULTA`
   - Adiciona defaults: `CONTABILIZADO="N"`, `CONCILIADO="N"`, `RATEADO="N"`, etc.

3. **Busca dos títulos gerados** (`buscarParcelasGeradas`)
   - Após confirmação, lê `responseBody.reneg.nroReneg`
   - SQL em `TGFFIN WHERE NURENEG = X` para obter os NUFINs criados

| Arquivo | Ação |
|---|---|
| `infrastructure/repositories/sankhya-renegociacao.repository.ts` | **Novo** — simular + confirmar + enriquecimento SQL |

**Payload da confirmação (estrutura `reneg`):**
```json
{
  "serviceName": "RenegociacaoSP.renegociar",
  "requestBody": {
    "reneg": {
      "nureneg": "",
      "prefs": { "calcDesc": "0", "manNossoNro": "N", "renegConDif": "N", "atuMetas": "N" },
      "titOrigs": { "titOrig": [{ "NUFIN": 2046971, "VLRJURO": 0, "VLRMULTA": 0.9 }] },
      "parcels": { "record": [...parcels enriquecidas] }
    }
  }
}
```

---

### 5.3. Backend — DTOs, Use-cases, Controller e Module

| Arquivo | Ação |
|---|---|
| `application/dto/renegociacao.dto.ts` | **Novo** — `ParcelamentoParams`, `ConfirmarRenegociacaoDto`, `SimulacaoResultado`, `ConfirmacaoResultado`, `ParcelaSimulada`, `ParcelaGerada` |
| `application/use-cases/renegociacao.use-cases.ts` | **Novo** — `simular()` e `confirmar()` |
| `presentation/renegociacao/renegociacao.controller.ts` | **Novo** — `POST /api/renegociacao/simular` e `POST /api/renegociacao/confirmar` |
| `presentation/renegociacao/renegociacao.module.ts` | **Novo** |
| `presentation/app.module.ts` | Atualizado — `RenegociacaoModule` registrado |

**Endpoints:**

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/renegociacao/simular` | Simula parcelamento (save:N) |
| POST | `/api/renegociacao/confirmar` | Confirma renegociação (RenegociacaoSP.renegociar) |

---

### 5.4. Backend — Campo `NURENEG` na Entidade Título

Adicionado campo `nureneg` em toda a cadeia para identificar títulos renegociados:

| Arquivo | Mudança |
|---|---|
| `domain/entities/titulo.entity.ts` | Adicionado `nureneg?: number \| null` no construtor e `create()` |
| `infrastructure/repositories/sankhya-titulo.repository.ts` | Adicionado `FIN.NURENEG` em todos os SELECTs + mapeamento |
| `application/dto/cobranca.dto.ts` | Adicionado `nureneg` no `TituloResponseDto` |
| `application/use-cases/titulo.use-cases.ts` | Adicionado `nureneg` no `mapToResponseDto()` |

---

### 5.5. Frontend — Types, API e Hook

| Arquivo | Ação |
|---|---|
| `types/renegociacao.ts` | **Novo** — `RenegociacaoParams`, `SimulacaoResultado`, `ConfirmarPayload`, `ConfirmacaoResultado`, `ParcelaSimulada`, `TitOrig`, `RenegPrefs`, opções de select, defaults |
| `types/cobranca.ts` | Atualizado — `nureneg` no `Titulo` |
| `lib/api.ts` | Atualizado — `renegociacaoApi.simular()` e `confirmar()` |
| `hooks/useRenegociacao.ts` | **Novo** — `useSimularRenegociacao` e `useConfirmarRenegociacao` (invalida queries de cobrança) |

**Defaults dos parâmetros** (baseados nos fetches reais):
```typescript
nroparcel: 3, freq: '3' (mensal), venc: '2' (a partir de hoje),
txjur: 1, txmul: 1, negoc: '2' (consolidar), codTipTit: 2,
codConta: 97, empresaNovosTitulos: 2
```

---

### 5.6. Frontend — Modal de Renegociação

**`RenegociacaoModal.tsx`** — modal completo com fluxo de 3 etapas:

1. **Seleção de títulos** — checkboxes (todos pré-selecionados), resumo com valor total
2. **Parâmetros** — nº parcelas, frequência, vencimento (+ datepicker para data fixa), taxas juros/multa, tipo negociação, tipo título, empresa, conta, checkbox "com entrada"
3. **Simulação** — tabela com DESDOBRAMENTO, DTVENC, VLRDESDOB, VLRJURO, VLRMULTA
4. **Confirmação** — envia parcels raw + titOrigs + prefs; tela de sucesso detalhada com NURENEG + tabela de NUFINs gerados

**UX:**
- Botão "Simular" (ícone Calculator) → exibe parcelas
- Botão "Confirmar Renegociação" (ícone CheckCircle, verde) → executa
- Tela de sucesso: badge NURENEG + tabela de títulos criados + botão "Fechar"
- Erros exibidos inline com ícone AlertTriangle

| Arquivo | Ação |
|---|---|
| `components/cobranca/RenegociacaoModal.tsx` | **Novo** — modal completo |

---

### 5.7. Frontend — Pontos de Acionamento

Botão "Renegociar" disponível em dois locais:

| Local | Arquivo | Implementação |
|---|---|---|
| Painel do Parceiro | `ParceiroDetailPanel.tsx` | Botão no header (ícone Handshake), desabilita se não há títulos em aberto |
| Tabela de Cobrança | `views/TableView.tsx` | Ícone Handshake na coluna "Ações" de cada linha |

**Badge de renegociação nos títulos:**
Títulos que já foram renegociados (`nureneg` preenchido) exibem badge "Reneg. XXXX" ao lado do número.

| Arquivo | Mudança |
|---|---|
| `components/cobranca/ParceiroDetailPanel.tsx` | Botão "Renegociar" + badge NURENEG + import Handshake |
| `components/cobranca/views/TableView.tsx` | Ícone Handshake na coluna Ações + modal |

---

### 5.8. Frontend — Correção de Parse de Datas Sankhya

O `formatDate()` usava `new Date(dateStr)` que não parseia o formato Sankhya `"28/08/2026 00:00:00"` (DD/MM/YYYY). Adicionado:

| Função | Uso |
|---|---|
| `parseSankhyaDate(dateStr)` | Converte `"DD/MM/YYYY HH:MM:SS"` → `Date` |
| `formatSankhyaDate(dateStr)` | Formata para exibição pt-BR |

Usado no modal para DTVENC das parcelas (simulação e confirmação).

| Arquivo | Ação |
|---|---|
| `lib/utils.ts` | Adicionado `parseSankhyaDate` e `formatSankhyaDate` |

---

### 5.9. Bugs Resolvidos Durante a Implementação

| Erro | Causa | Solução |
|---|---|---|
| "estrutura de parcelas não foi reconhecida" | Parser genérico tentava 6 caminhos; o correto é `parcelados.ROW[]` | Reescrito `parseSimulacao` com caminho exato |
| Vencimentos `--/--/----` na simulação | `new Date()` não parseia `"28/08/2026 00:00:00"` | Criado `formatSankhyaDate` com regex manual |
| "O Natureza deve ser informado" | Confirmação sem enriquecimento de campos | Adicionado SQL de template + `enriquecerParcela` |
| `ORA-00904: CODNATCODTITCOB identificador inválido` | Campo customizado não existe na instalação | Removido do SELECT |
| `Erro de conversão DHTIPOPER: 28072026` | Data do SQL vinha em formato DDMMYYYY | Usado `TO_CHAR(..., 'DD/MM/YYYY HH24:MI:SS')` |
| Tela de sucesso vazia (NURENEG —) | Parser procurava `nureneg`; o correto é `reneg.nroReneg` | Ajustado `extractNureneg` + SQL de busca por `NURENEG` |
| Modal fechava rápido demais | `setTimeout(onClose, 3000)` automático | Removido auto-close; botão "Fechar" manual |

---

### 5.10. Pendências para Próximas Rodadas

#### Toggles S/N (checkboxes avançados)
Campos identificados nos payloads mas ainda hardcoded com defaults:

| Campo | Default | Descrição |
|---|---|---|
| `calc` | `"S"` | Calcular juros/multa automaticamente |
| `cpyrat` | `"S"` | Copiar rateio |
| `hist` | `"N"` | Replicar histórico |
| `considerarEntradaCalcJuroMulta` | `"N"` | Considerar entrada no cálculo |
| `zerarJuroMulta` | `"N"` | Zerar juros e multa |
| `jurosAteDataAtual` | `"S"` | Juros até data atual |
| `priceJurMulDesc` | `"N"` | Tabela Price |
| `varCambialJurMult` | `"N"` | Variação cambial |
| `recalcularTaxaAdministradora` | `"N"` | Recalcular taxa administradora |

#### Selects adicionais
| Campo | Opções |
|---|---|
| `tip` (tipo parcelamento) | 0=Juros simples, 1=Composto, 2=Composto fixas, 3=Duplicação sem juros |
| `dtNeg` (data negociação) | 1=Original, 2=Igual novo venc, 3=Hoje |

#### Mapeamentos confirmados dos códigos Sankhya
**`venc.value` (data base vencimento):**
- `"1"` = Manter vencimento original
- `"2"` = A partir de hoje
- `"3"` = Data fixa (exige `venc.nova` no formato `"DD/MM/YYYY"`)

**`freq.value` (frequência):**
- `"1"`=Semanal, `"2"`=Quinzenal, `"3"`=Mensal, `"4"`=Bimestral, `"5"`=Trimestral, `"6"`=Quadrimestral, `"7"`=Semestral, `"8"`=Anual

**`negoc.value` (tipo negociação):**
- `"1"` = Renegociar mantendo
- `"2"` = Consolidar títulos

---

### 5.11. Estrutura de Arquivos da Renegociação

```
backend/src/
├── application/
│   ├── dto/renegociacao.dto.ts                    # NOVO
│   └── use-cases/renegociacao.use-cases.ts        # NOVO
├── domain/entities/titulo.entity.ts               # nureneg adicionado
├── infrastructure/
│   ├── repositories/sankhya-renegociacao.repository.ts  # NOVO
│   └── sankhya/sankhya.gateway.ts                 # mgefin adicionado
└── presentation/
    ├── renegociacao/                              # NOVO
    │   ├── renegociacao.controller.ts
    │   └── renegociacao.module.ts
    └── app.module.ts                              # RenegociacaoModule registrado

frontend/
├── components/cobranca/
│   ├── RenegociacaoModal.tsx                      # NOVO
│   ├── ParceiroDetailPanel.tsx                    # Botão + badge
│   └── views/TableView.tsx                        # Ícone na coluna Ações
├── hooks/useRenegociacao.ts                       # NOVO
├── lib/
│   ├── api.ts                                     # renegociacaoApi
│   └── utils.ts                                   # formatSankhyaDate
└── types/
    ├── cobranca.ts                                # nureneg no Titulo
    └── renegociacao.ts                            # NOVO
```

---

## Sessão 4 — Mapeamento de Tabelas, NFE/DANFE, Frontend Completo e Paginação

### 4.0. Levantamento de Tabelas via DbExplorerSP

Consultamos a estrutura real de 3 tabelas diretamente do banco Oracle do Sankhya:

| Tabela | Colunas | Entidade Sankhya | PK | Uso |
|---|---|---|---|---|
| **TGFFIN** | 245 | Financeiro | NUFIN | Títulos financeiros (parcelas, duplicatas) |
| **TGFTEL** | 28 | Telefone | NUREL | Registro de chamadas/contatos com parceiros |
| **TGFNFE** | 26 | NFE | NUNOTA | XML da NFE para visualização do DANFE |

Script criado: `backend/scripts/query-table-structure.ts`
Documentação completa: [`ESTRUTURA_TABELAS.md`](./ESTRUTURA_TABELAS.md)

---

### 4.1. Correção Crítica: TGFCAB → TGFFIN

O código original consultava `TGFCAB` (CabeçalhoNota) para obter títulos financeiros, o que trazia dados incorretos (sem vencimento, sem valor baixado, sem parcelas). Corrigido para usar **TGFFIN**.

**Regras de status derivadas de TGFFIN:**

| Condição | Status |
|---|---|
| `DHBAIXA IS NULL` AND `DTVENC < SYSDATE` | **VENCIDO** |
| `DHBAIXA IS NULL` AND `DTVENC >= SYSDATE` | **PENDENTE** |
| `DHBAIXA IS NOT NULL` AND `VLRBAIXA >= VLRDESDOB` | **BAIXADO** |
| `DHBAIXA IS NOT NULL` AND `VLRBAIXA < VLRDESDOB` | **BAIXA_PARCIAL** |

---

### 4.2. Backend — Módulo TGFTEL (Contatos de Cobrança)

Entidade `Contato` com enums `TipoContato` (WHATSAPP, TELEFONE, EMAIL, BOLETO, SMS, OUTRO) e `SituacaoContato`.

| Arquivo | Ação |
|---|---|
| `domain/entities/contato.entity.ts` | **Novo** — entidade Contato |
| `domain/repositories/contato.repository.interface.ts` | **Novo** — interface IContatoRepository |
| `infrastructure/repositories/sankhya-contato.repository.ts` | **Novo** — implementação via TGFTEL |
| `application/use-cases/contato.use-cases.ts` | **Novo** |
| `application/dto/cobranca.dto.ts` | Atualizado — ContatoResponseDto, CreateContatoDto |
| `presentation/cobranca/cobranca.controller.ts` | Atualizado — 8 endpoints de contatos |

---

### 4.3. Backend — Módulo TGFNFE (DANFE / XML da Nota Fiscal)

Entidade `NfeDados` que faz parse do XML CLOB da TGFNFE em dados estruturados.

| Arquivo | Ação |
|---|---|
| `domain/entities/nfe.entity.ts` | **Novo** — NfeDados, NfeXml, NfeItem |
| `infrastructure/repositories/sankhya-nfe.repository.ts` | **Novo** — le CLOB em chunks (3900 bytes cada) |
| `infrastructure/repositories/xml2js-parser.ts` | **Novo** — parse XML → JSON estruturado |
| `presentation/nfe/nfe.controller.ts` | **Novo** — endpoints da NFE |
| `presentation/nfe/nfe.module.ts` | **Novo** |

**Fluxo:**
```
TGFFIN.NUMNOTA → TGFCAB.NUMNOTA → TGFNFE.NUNOTA → XML (CLOB) → parse → DANFE
```

**Ligação TGFFIN ↔ TGFNFE via TGFCAB:**
Cada `NUMNOTA` tem 2 registros em TGFCAB (Pedido sem XML + Venda com XML). A query filtra apenas notas que **realmente têm XML**:
```sql
SELECT NFE.NUNOTA, CAB.NUMNOTA, NFE.CHAVENFE, NFE.XML
FROM TGFNFE NFE
INNER JOIN TGFCAB CAB ON CAB.NUNOTA = NFE.NUNOTA
WHERE CAB.NUMNOTA = :numnota
  AND NFE.XML IS NOT NULL
  AND DBMS_LOB.GETLENGTH(NFE.XML) > 0
ORDER BY NFE.NUNOTA DESC
```

**Leitura de CLOB em chunks** (necessário pois DbExplorer tem limite de buffer):
```
1. Buscar metadados: NUNOTA, CHAVENFE, DBMS_LOB.GETLENGTH(XML)
2. Calcular chunks: ceil(tamanho / 3900)
3. Loop: DBMS_LOB.SUBSTR(XML, 3900, offset) para cada chunk
4. Concatenar todas as partes
5. Parse XML com xml2js
```

**Endpoints NFE:**

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/nfe/:id?tipo=numnota` | Dados parseados da NFE (busca por NUMNOTA) |
| GET | `/api/nfe/:id` | Dados parseados da NFE (busca por NUNOTA) |
| GET | `/api/nfe/:id/xml?tipo=numnota` | XML raw para download |

---

### 4.4. Backend — Endpoint da Fila de Cobrança com Paginação

`GET /api/cobranca/fila` — agrupa títulos de TGFFIN por parceiro, calcula prioridade, com paginação server-side.

**Prioridade:** `valorVencido * (1 + diasAtraso / 30)` — quanto maior o valor e o atraso, mais prioritário.

**Query params:**
- `page` (default: 1)
- `limit` (default: 20)
- `q` (busca textual por nome/CNPJ no banco)
- `apenasVencidos` (boolean)

**Retorno:**
```json
{
  "items": [...],
  "total": 347,
  "page": 1,
  "limit": 20,
  "totalPages": 18
}
```

**Paginação Oracle via ROW_NUMBER:**
```sql
SELECT * FROM (
  SELECT ..., ROW_NUMBER() OVER (ORDER BY ...) AS RN
  FROM TGFFIN ... GROUP BY CODPARC ...
)
WHERE RN > :offset AND RN <= :offset + :limit
```

| Arquivo | Ação |
|---|---|
| `domain/repositories/titulo.repository.interface.ts` | Adicionado `FilaCobrancaResult`, `FilaCobrancaOptions`, `findFilaCobranca(opts)` |
| `infrastructure/repositories/sankhya-titulo.repository.ts` | Reescrito com paginação Oracle |
| `application/use-cases/titulo.use-cases.ts` | `buscarFilaCobranca(opts)` |
| `presentation/cobranca/cobranca.controller.ts` | Endpoint com query params |

---

### 4.5. Backend — Correções de Bugs

#### Bug: Agenda 500 (TGFTEL com campos de TGFFIN)
O `AgendaController` consultava TGFTEL usando campos financeiros que não existem nela (`NULAN`, `DHVENC`, `VLRDESDOB`). Reescrito para consultar **TGFFIN** com `DTVENC = hoje`.

#### Bug: findByCliente trazia títulos com valor zero
O `findByCliente(clienteId)` não filtrava `DHBAIXA IS NULL` nem `VLRDESDOB > 0`. Adicionado:
```sql
AND FIN.DHBAIXA IS NULL
AND FIN.VLRDESDOB > 0
AND NVL(FIN.VLRDESDOB, 0) - NVL(FIN.VLRBAIXA, 0) > 0
```

#### Bug: Datas não parseavam (formato Sankhya)
O Sankhya retorna datas no formato `"31072026 00:00:00"` (DDMMYYYY sem separadores). O `parseDate()` não reconhecia esse formato. Adicionado regex para interpretar:
- `DDMMYYYY HH:MM:SS`
- `DDMMYYYY`

Também corrigido: `DHBAIXA = null` (título em aberto) retornava `new Date()` (hoje) ao invés de `null`.

#### Bug: DANFE 404 para NUMNOTA com múltiplos registros
Cada `NUMNOTA` tem 2 registros em TGFCAB: Pedido (`TIPMOV='P'`, sem XML) e Venda (`TIPMOV='V'`, com XML). O `ROWNUM <= 1` sem `ORDER BY` pegava aleatoriamente o Pedido. Corrigido com filtro `NFE.XML IS NOT NULL AND DBMS_LOB.GETLENGTH > 0`.

---

### 4.6. Backend — Hot Reload

Configurado NestJS com watch mode:
- `npm run dev` → `nest start --watch` (recompila e reinicia ao salvar)
- `npm run dev:debug` → `nest start --debug --watch` (com debugger)
- Criado `nest-cli.json`

---

### 4.7. Frontend — Sistema de Cobrança Completo

#### Arquitetura

```
frontend/
├── app/
│   ├── cobranca/
│   │   ├── layout.tsx           # AppShell (Sidebar + auth guard)
│   │   ├── page.tsx             # Dashboard + FilaCobranca
│   │   └── fila/page.tsx        # Apenas vencidos
│   ├── agenda/
│   │   ├── layout.tsx           # AppShell
│   │   └── page.tsx             # Agenda do dia
│   ├── login/page.tsx           # Tela de login standalone
│   └── page.tsx                 # Redirect → /cobranca
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx         # Shell compartilhado
│   │   └── Sidebar.tsx          # Navegação lateral
│   ├── cobranca/
│   │   ├── FilaCobranca.tsx     # Container + switcher de views
│   │   ├── DashboardCards.tsx   # KPIs clicáveis
│   │   ├── ParceiroCard.tsx     # Card reutilizável
│   │   ├── ParceiroDetailPanel.tsx  # Painel completo
│   │   ├── ContatoForm.tsx      # Registro de contato
│   │   └── views/
│   │       ├── MasterDetailView.tsx  # Lista + painel (infinite scroll)
│   │       ├── KanbanView.tsx        # 3 colunas
│   │       └── TableView.tsx         # Tabela com sort
│   ├── nfe/
│   │   └── DanfeViewer.tsx      # Modal formatado como DANFE
│   └── ui/
│       ├── badge.tsx, dialog.tsx, select.tsx, textarea.tsx
├── hooks/
│   ├── useCobranca.ts           # KPIs, Fila (infinite query), Contatos
│   └── useNfe.ts                # NFE dados
├── lib/
│   ├── api.ts                   # authApi, agendaApi, cobrancaApi, nfeApi
│   └── utils.ts                 # formatCurrency, formatDate, diasAtraso, etc
└── types/
    ├── cobranca.ts              # FilaItem, Titulo, Contato, KPIs, paginação
    ├── nfe.ts                   # NfeDados, NfeItem
    └── agenda.ts                # Agendamento, AgendaResponse
```

#### Features do Frontend

**Dashboard com KPIs clicáveis:**
- Cards: Em Aberto, Vencidos, A Vencer (7d), Baixados
- Clicar num card filtra a fila automaticamente
- Badge de contatos pendentes

**3 Modos de Visualização (switcher):**

1. **Master-Detail** — Lista na esquerda + painel de detalhe na direita. Busca server-side com debounce (400ms), infinite scroll via IntersectionObserver, filtros rápidos (Críticos, Alta prioridade, Com telefone)

2. **Kanban** — 3 colunas: A Contatar / Em Andamento / Contatado Hoje. Cards com botões de WhatsApp/Telefone direto. Botão "Carregar mais"

3. **Tabela** — Tabela com sorting (clique nas colunas), busca server-side, botão "Carregar mais"

**Painel de Detalhe do Parceiro:**
- Nome, CNPJ/CPF, dias de atraso
- Botões de ação rápida: WhatsApp, Telefone (tel:), E-mail (mailto:)
- Resumo financeiro (total/vencido/a vencer)
- Lista de títulos em aberto com botão **DANFE** em cada um
- Histórico de contatos (TGFTEL)
- Formulário de registro de contato (canal, mensagem, observações, agendamento)

**DANFE Viewer (modal formatado):**
- Header com número, série, status, download XML
- Chave de acesso com link para consulta SEFAZ
- Cards de emitente e destinatário
- Tabela de produtos/serviços
- Totais (produtos, desconto, frete, ICMS, valor total)
- Transporte e forma de pagamento
- QR Code para NFC-e

**Infinite Scroll + Paginação:**
- `useFilaCobranca` usa `useInfiniteQuery` do React Query
- 20 itens por página, carrega próxima ao chegar no fim da lista
- Busca textual server-side (não filtra no frontend)
- `refetchInterval: 60s` para manter dados frescos

---

### 4.8. Documentação Atualizada

| Arquivo | Descrição |
|---|---|
| `ESTRUTURA_TABELAS.md` | Estrutura completa de TGFFIN (245 col), TGFTEL (28 col), TGFNFE (26 col) |
| `PROGRESSO.md` | Este arquivo — sessão 4 completa |
| `IMPLEMENTACAO.md` | Arquitetura, camadas, endpoints atualizados |
| `EXEMPLOS_USO.md` | Exemplos de todos os endpoints incluindo NFE e contatos |
| `ESTRUTURA.md` | Estrutura de diretórios atualizada |
| `README.md` | Features e quick start atualizados |
| `REESTRUTURACAO.md` | Endpoints e marcos atualizados |

---

## Mapa de Relacionamento das Tabelas

```
TGFPAR (Parceiros)          TGFFIN (Títulos)           TGFCAB (CabeçalhoNota)     TGFNFE (XML NFE)
┌──────────────┐           ┌──────────────┐           ┌──────────────┐           ┌──────────────┐
│ CODPARC (PK) │◄──────────│ CODPARC (FK) │           │ NUNOTA (PK)  │──────────►│ NUNOTA (PK)  │
│ NOMEPARC     │           │ NUFIN (PK)   │           │ NUMNOTA      │           │ CHAVENFE     │
│ TELEFONE     │           │ NUNOTA ──────┼──────────►│ TIPMOV       │           │ XML (CLOB)   │
│ EMAIL        │           │ NUMNOTA      │           │ DTNEG        │           │ QRCODE       │
│ CGC_CPF      │           │ DTVENC       │           └──────────────┘           └──────────────┘
└──────────────┘           │ VLRDESDOB    │                ▲
       ▲                   │ VLRBAIXA     │                │
       │                   │ DHBAIXA      │           TGFFIN.NUNOTA → TGFCAB.NUNOTA
       │                   │ RECDESP      │           TGFFIN.NUMNOTA = TGFCAB.NUMNOTA
       │                   │ SERIENOTA    │
       │                   │ DESDOBRAMENTO│
       │                   └──────────────┘
       │                          │
       │                          │
  TGFTEL (Contatos)               │ Busca DANFE:
  ┌──────────────┐                │ titulo.numero (NUMNOTA)
  │ NUREL (PK)   │                │ → GET /api/nfe/{NUMNOTA}?tipo=numnota
  │ CODPARC (FK) │◄───────────────┤ → JOIN TGFCAB ON NUNOTA
  │ DHCHAMADA    │                │ → TGFNFE.XML
  │ DHPROXCHAM   │                │ → parse XML → renderizar DANFE
  │ AD_TIPCHAMADA│                │
  │ AD_MSG       │                │
  │ PENDENTE     │                │
  │ SITUACAO     │                │
  └──────────────┘                │
```

---

## Endpoints da API (Total: 28)

### Autenticação
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/sankhya-login` | Login de usuário |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/validate` | Validar sessão |

### Agenda
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/agenda/hoje` | Vencimentos do dia (TGFFIN) |

### Cobrança — Dashboard
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/cobranca/dashboard/kpis` | KPIs (totais, valores, contatos pendentes) |

### Cobrança — Fila de Atendimento
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/cobranca/fila` | Fila paginada com `?page`, `?limit`, `?q`, `?apenasVencidos` |

### Cobrança — Títulos (TGFFIN)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/cobranca/titulos/em-aberto` | Todos em aberto |
| GET | `/api/cobranca/titulos/vencidos` | Vencidos |
| GET | `/api/cobranca/titulos/a-vencer` | A vencer |
| GET | `/api/cobranca/titulos/:id` | Detalhe por NUFIN |
| GET | `/api/cobranca/titulos/:id/boleto` | Dados do boleto (TGFFIN + TSICTA + cedente/sacado) |
| GET | `/api/cobranca/titulos/cliente/:clienteId` | Títulos por parceiro (apenas com saldo) |
| PUT | `/api/cobranca/titulos/:id/status` | Atualizar status |

### Cobrança — Contatos (TGFTEL)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/cobranca/contatos` | Registrar contato |
| GET | `/api/cobranca/contatos` | Listar (filtros: tipo, situacao, pendentes, proximas) |
| GET | `/api/cobranca/contatos/:id` | Detalhe |
| GET | `/api/cobranca/contatos/parceiro/:parceiroId` | Contatos por parceiro |
| PUT | `/api/cobranca/contatos/:id/situacao` | Atualizar situação |
| PUT | `/api/cobranca/contatos/:id/concluir` | Concluir contato |

### Cobrança — Cobranças (In-Memory)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/cobranca/cobrancas` | Criar cobrança |
| GET | `/api/cobranca/cobrancas` | Listar |
| GET | `/api/cobranca/cobrancas/:id` | Detalhe |
| PUT | `/api/cobranca/cobrancas/:id` | Atualizar |
| PUT | `/api/cobranca/cobrancas/:id/entregue` | Marcar entregue |

### Renegociação (mgefin)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/renegociacao/simular` | Simula parcelamento (`ParcelamentoSP.parcelar` save:N) |
| POST | `/api/renegociacao/confirmar` | Confirma renegociação (`RenegociacaoSP.renegociar`) |

### NFE / DANFE (TGFNFE)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/nfe/:id?tipo=numnota` | Dados da NFE por NUMNOTA |
| GET | `/api/nfe/:id` | Dados da NFE por NUNOTA |
| GET | `/api/nfe/:id/xml?tipo=numnota` | XML raw para download |

### Sistema
| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Health check |

---

## Estrutura do Projeto

```
Financeiro Sankhya/
├── backend/                              # NestJS (Clean Architecture)
│   ├── src/
│   │   ├── main.ts                       # Entry point (porta 3001)
│   │   ├── presentation/
│   │   │   ├── app.module.ts             # Registro de todos os módulos
│   │   │   ├── health/                   # Health check
│   │   │   ├── auth/                     # Autenticação Sankhya
│   │   │   ├── cobranca/                 # Controller de cobrança (26 rotas)
│   │   │   ├── agenda/                   # Agenda do dia (TGFFIN)
│   │   │   └── nfe/                      # NFE/DANFE (TGFNFE)
│   │   ├── domain/
│   │   │   ├── entities/                 # Titulo, Contato, Cobranca, NfeDados
│   │   │   └── repositories/             # Interfaces ITitulo, IContato, ICobranca
│   │   ├── application/
│   │   │   ├── use-cases/                # TituloUseCases, CobrancaUseCases, ContatoUseCases
│   │   │   ├── dto/                      # DTOs com class-validator
│   │   │   └── cobranca/cobranca.module.ts
│   │   └── infrastructure/
│   │       ├── sankhya/sankhya.gateway.ts  # OAuth2 + REST + executeQuery
│   │       └── repositories/
│   │           ├── sankhya-titulo.repository.ts   # TGFFIN + fila paginada
│   │           ├── sankhya-contato.repository.ts  # TGFTEL
│   │           ├── sankhya-nfe.repository.ts      # TGFNFE + chunked CLOB
│   │           ├── xml2js-parser.ts               # XML → JSON
│   │           └── in-memory-cobranca.repository.ts
│   ├── scripts/
│   │   ├── query-table-structure.ts      # Consulta estrutura de tabelas
│   │   ├── test-nfe-xml.ts               # Teste de leitura de CLOB
│   │   ├── test-nfe-parse.ts             # Teste de parse de XML
│   │   └── debug-titulo.ts              # Debug de dados de título
│   ├── nest-cli.json                     # Config NestJS (watch mode)
│   ├── .env                              # Credenciais Sankhya
│   └── package.json                      # dev: nest start --watch
│
├── frontend/                             # Next.js 16 (App Router)
│   ├── app/
│   │   ├── layout.tsx                    # Root layout + Providers
│   │   ├── page.tsx                      # Redirect → /cobranca
│   │   ├── login/                        # Tela de login standalone
│   │   ├── cobranca/                     # Dashboard + Fila (3 views)
│   │   └── agenda/                       # Vencimentos do dia
│   ├── components/
│   │   ├── layout/                       # AppShell, Sidebar
│   │   ├── cobranca/                     # FilaCobranca, DashboardCards,
│   │   │                                 # ParceiroCard, ParceiroDetailPanel,
│   │   │                                 # ContatoForm, views/ (3)
│   │   ├── nfe/                          # DanfeViewer
│   │   ├── agenda/                       # AgendaList
│   │   ├── auth/                         # LoginForm
│   │   └── ui/                           # badge, button, card, dialog, input,
│   │                                     # label, select, textarea
│   ├── hooks/
│   │   ├── useAuth.ts                    # Login / Logout
│   │   ├── useCobranca.ts                # KPIs, Fila (infinite), Contatos
│   │   ├── useNfe.ts                     # NFE dados
│   │   └── useAgenda.ts                  # Agenda do dia
│   ├── lib/
│   │   ├── api.ts                        # authApi, agendaApi, cobrancaApi, nfeApi
│   │   └── utils.ts                      # cn, formatCurrency, formatDate,
│   │                                     # formatPhone, diasAtrasoLabel, etc
│   ├── store/authStore.ts                # Zustand (persist)
│   ├── types/
│   │   ├── cobranca.ts                   # FilaItem, Titulo, Contato, paginação
│   │   ├── nfe.ts                        # NfeDados, NfeItem
│   │   ├── agenda.ts                     # Agendamento
│   │   └── auth.ts                       # User, LoginResponse
│   └── next.config.ts                    # Proxy /api → :3001
│
├── ESTRUTURA_TABELAS.md                  # TGFFIN (245), TGFTEL (28), TGFNFE (26)
├── IMPLEMENTACAO.md                      # Arquitetura + endpoints
├── EXEMPLOS_USO.md                       # Exemplos curl de todos endpoints
├── ESTRTURA.md                           # Estrutura de diretórios
├── README.md                             # Visão geral
├── REESTRUTURACAO.md                     # Marcos da reestruturação
├── SANKHYA_API_GUIDE.md                  # Guia de integração Sankhya
└── PROGRESSO.md                          # Este arquivo
```

---

## Comandos

```bash
# Backend (com hot reload)
cd backend && npm run dev          # nest start --watch (porta 3001)
cd backend && npm run dev:debug    # nest start --debug --watch
cd backend && npm run build        # tsc
cd backend && npx tsc --noEmit     # Typecheck

# Frontend
cd frontend && npm run dev         # next dev (porta 3000)
cd frontend && npm run build       # next build
cd frontend && npx tsc --noEmit    # Typecheck

# Scripts de debug
cd backend && npx ts-node scripts/query-table-structure.ts   # Estrutura de tabelas
cd backend && npx ts-node scripts/test-nfe-parse.ts          # Testar parse NFE
cd backend && npx ts-node scripts/debug-titulo.ts            # Debug título por CODPARC
```

---

## Ambientes

| Ambiente | Backend URL | Frontend URL | Sankhya Gateway |
|---|---|---|---|
| Desenvolvimento | `http://localhost:3001` | `http://localhost:3000` | `https://api.sandbox.sankhya.com.br` |
| Produção | TBD | TBD | `https://api.sankhya.com.br` |

---

## Sessões Anteriores

### Sessão 4 — Mapeamento de Tabelas, NFE/DANFE, Frontend Completo e Paginação
- Levantamento de estrutura de TGFFIN (245 col), TGFTEL (28 col), TGFNFE (26 col)
- Correção crítica TGFCAB → TGFFIN para títulos financeiros
- Módulo TGFNFE com leitura de CLOB em chunks + parse XML → DANFE
- Endpoint de fila de cobrança com paginação Oracle (ROW_NUMBER)
- Frontend completo: 3 views (Master-Detail, Kanban, Tabela), Dashboard, Painel de Detalhe, DANFE Viewer
- Correções de bugs (datas Sankhya, DANFE 404, findByCliente)

### Sessão 3 — Reestruturação para Clean Architecture
- Migração de código monolítico para Clean Architecture (domain/application/infrastructure/presentation)
- SankhyaGateway com OAuth2
- Auth com Zustand + React Query
- Frontend App Router

### Sessão 2 — Login e Autenticação
- Integração com Sankhya MobileLoginSP
- Correção de bugs (CORS, URL duplicada, Buffer no browser)
- Proxy no next.config.ts
- Zustand persist para token

### Sessão 1 — Setup Inicial
- Criação do projeto (NestJS + Next.js)
- Conexão com Sankhya Gateway
- Primeiros endpoints
