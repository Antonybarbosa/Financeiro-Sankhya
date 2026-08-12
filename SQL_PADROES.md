# Padrões SQL Oracle — Sankhya

Guia de referência para evitar armadilhas comuns do Oracle ao construir queries dinâmicas neste projeto.

---

## 1. Limite de `IN (lista)` — ORA-01795

### Problema

Oracle limita a **1000 expressões** em cláusulas `IN (lista)`:

```
ORA-01795: o número máximo de expressões em uma lista é de 1000
```

Qualquer query construída com `IN (${ids.join(',')})` onde `ids` vem de um array dinâmico pode quebrar em produção quando o array crescer.

### Solução: `chunkedIn()`

Arquivo: `backend/src/infrastructure/sankhya/sql-utils.ts`

```typescript
import { chunkedIn } from '../sankhya/sql-utils';

const inClause = chunkedIn('FIN.CODPARC', parceiroIds);
const sql = `SELECT ... FROM TGFFIN FIN WHERE ${inClause}`;
```

#### Comportamento

| Entrada | SQL gerado |
|---|---|
| `[1, 2, 300]` | `FIN.CODPARC IN (1,2,300)` |
| `[1, ..., 1500]` | `(FIN.CODPARC IN (1,...,1000) OR FIN.CODPARC IN (1001,...,1500))` |
| `[]` (vazio) | `1=0` (sempre falso — seguro em qualquer WHERE) |

#### Características

- Deduplica IDs com `new Set` antes de particionar.
- Limite de 1000 por chunk é hardcode (`ORACLE_IN_LIMIT`).
- Une múltiplos chunks com `OR` entre parênteses.
- Lista vazia retorna `1=0` (não `1=1`) para evitar falsos positivos.

### Quando usar

**Sempre** que uma query tiver `IN (lista)` onde a lista vem de array dinâmico (outro resultado de query, input do usuário, etc.). Mesmo que hoje o array seja pequeno, amanhã pode crescer.

### Onde está sendo usado

| Arquivo | Método | Coluna |
|---|---|---|
| `sankhya-titulo.repository.ts` | `findResumoFinanceiroPorParceiros` | `FIN.CODPARC` |
| `sankhya-titulo.repository.ts` | `findResumoFinanceiroAgregado` | `FIN.CODPARC` |
| `sankhya-titulo.repository.ts` | `aplicarOverlayPendente` | `TEL.CODPARC` |
| `sankhya-renegociacao.repository.ts` | `buscarTemplateTitulos` | `FIN.NUFIN` |

### Quando NÃO usar

- Lista fixa/pequena e conhecida (ex: `RECDESP IN (1, -1)`).
- Lista vem de subquery correlacionada (`EXISTS (SELECT ...)`) — não tem limite.

---

## 2. Paginação com ROWNUM (Oracle 11g e superior)

### Padrão

```sql
SELECT * FROM (
  SELECT inner_q.*, ROWNUM AS RN FROM (
    -- query real COM ORDER BY aqui (obrigatório para paginação determinística)
    SELECT col1, col2 FROM tabela ORDER BY col1 ASC
  ) inner_q
  WHERE ROWNUM <= :offset + :limit      -- limite superior (inclusivo)
)
WHERE RN > :offset                       -- limite inferior (exclusivo)
```

### Por que esse padrão

- **`ROWNUM` é aplicado antes do `ORDER BY`** sem o aninhamento. Por isso o `ORDER BY` fica na query mais interna.
- **`ROWNUM <= N` no nível intermediário** permite ao Oracle parar cedo (optimization).
- **Compatível com qualquer versão do Oracle** (não requer `OFFSET/FETCH` do 12c+).
- O Sankhya roda em Oracle — assumir versão conservadora.

### Cálculo de offset

```typescript
const offset = (page - 1) * limit;   // página 1, limit 50 → offset 0
```

### Exemplo no projeto

`backend/src/presentation/agenda/agenda.controller.ts`:

```typescript
const rows = await this.sankhyaGateway.executeQuery(`
  SELECT * FROM (
    SELECT inner_q.*, ROWNUM AS RN FROM (
      SELECT FIN.NUFIN, ... FROM TGFFIN FIN ... ORDER BY FIN.DTVENC ASC
    ) inner_q
    WHERE ROWNUM <= ${offset + limitNum}
  )
  WHERE RN > ${offset}
`);
```

---

## 3. Totalizadores paginados

Quando a lista é paginada mas os totais (somas, contagens) precisam ser globais, faça **uma query de totais separada** antes da query paginada:

```sql
-- Query 1: totais globais (não paginada)
SELECT COUNT(*) AS TOTAL,
       SUM(CASE WHEN ... END) AS TOTAL_RECEBER
FROM tabela WHERE ...

-- Query 2: dados paginados
SELECT * FROM ( ... ) WHERE RN > :offset
```

Isso evita que os totais mudem entre páginas e mantém a UI consistente.

---

## 4. Sintaxe Oracle essencial

Funções usadas frequentemente neste projeto:

| Função | Uso | Exemplo |
|---|---|---|
| `TRUNC(date)` | Remove hora de uma data | `TRUNC(FIN.DTVENC) = TRUNC(SYSDATE)` |
| `SYSDATE` | Data/hora atual do servidor | `WHERE DTVENC < TRUNC(SYSDATE)` |
| `TO_DATE(str, fmt)` | Converte string para data | `TO_DATE('11/08/2026', 'DD/MM/YYYY')` |
| `NVL(a, b)` | Coalesce — retorna `b` se `a` for NULL | `NVL(FIN.VLRBAIXA, 0)` |
| `ROWNUM` | Número da linha (pseudo-coluna) | Paginação (ver seção 2) |
| `DECODE(a, b1, c1, b2, c2, default)` | Switch/case | `DECODE(TEL.PENDENTE, 'S', 0, 'N', 1)` |
| `ROW_NUMBER() OVER (...)` | Ranking particionado | Última chamada por parceiro |

### Formatos de data comuns

```
'DD/MM/YYYY'              — 11/08/2026
'DD/MM/YYYY HH24:MI:SS'   — 11/08/2026 23:59:59
```

---

## 5. Boas práticas neste projeto

1. **Sempre use `chunkedIn()`** para listas `IN` dinâmicas — mesmo se você acha que nunca vai passar de 1000.
2. **Sempre faça `Math.floor` e validação de tipos numéricos** antes de interpolar valores em SQL (evita SQL injection mesmo que o gateway não suporte bind params).
3. **Sempre use `TRUNC()` ao comparar datas** sem horário — `DTVENC = SYSDATE` quase nunca é verdade porque `SYSDATE` tem hora.
4. **Filtros de qualidade do dado**: sempre incluir `PROVISAO <> 'S'` e `VLRDESDOB > 0` ao consultar títulos financeiros em `TGFFIN`, para ignorar provisões e títulos zerados.
5. **Prefira `EXISTS` a `JOIN`** quando a relação é "1 para N" e você quer evitar duplicação da entidade principal.
