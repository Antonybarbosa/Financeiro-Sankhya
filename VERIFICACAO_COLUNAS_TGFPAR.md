# Verificação de Colunas da TGFPAR

## Endpoint para Inspeção de Tabelas

Adicionei um endpoint para verificar as colunas de qualquer tabela no banco Sankhya.

### Uso

#### Endpoint TGFPAR Específico
```
GET /health/tgfpar-columns
```

#### Endpoint Genérico
```
GET /health/table-columns?table=TGFPAR
```

### Resposta

```json
{
  "table": "TGFPAR",
  "columns": [
    {
      "COLUMN_ID": 1,
      "COLUMN_NAME": "CODPARC",
      "DATA_TYPE": "NUMBER",
      "DATA_LENGTH": 22,
      "DATA_PRECISION": 10,
      "DATA_SCALE": 0,
      "NULLABLE": "N",
      "COMMENTS": "Código do parceiro"
    },
    {
      "COLUMN_ID": 2,
      "COLUMN_NAME": "NOMEPARC",
      "DATA_TYPE": "VARCHAR2",
      "DATA_LENGTH": 60,
      "DATA_PRECISION": null,
      "DATA_SCALE": null,
      "NULLABLE": "N",
      "COMMENTS": "Nome do parceiro"
    }
    // ... mais colunas
  ],
  "total": 50
}
```

### Colunas da TGFPAR que devem ser verificadas

Baseado na documentação ESTRUTURA_TABELAS.md, estas são as colunas esperadas na TGFPAR:

- **CODPARC** - Código do parceiro (PK)
- **NOMEPARC** - Nome do parceiro
- **NOMEFANTASIA** - Nome fantasia
- **RAZAOSOCIAL** - Razão social
- **CGC_CPF** - CNPJ/CPF
- **TIPO** - Tipo de pessoa (F/J)
- **SITPARC** - Situação do parceiro (A=Ativo, I=Inativo)
- **TELEFONE** - Telefone
- **EMAIL** - Email
- **INSCREST** - Inscrição estadual
- **DTCAD** - Data de cadastro
- **DTALTER** - Data de alteração (verificar se existe)
- **CODEND** - Código do endereço (FK → TSIEND)
- **NUMEND** - Número do endereço
- **COMPLEMENTO** - Complemento
- **CEP** - CEP
- **CODBAI** - Código do bairro (FK → TSIBAI)
- **CODCID** - Código da cidade (FK → TSICID)

### Colunas em Tabelas Auxiliares

#### TSIEND (Endereços)
- **CODEND** - Código do endereço (PK)
- **NOMEEND** - Nome do logradouro (rua, avenida, etc.)

#### TSIBAI (Bairros)
- **CODBAI** - Código do bairro (PK)
- **NOMEBAI** - Nome do bairro

#### TSICID (Cidades)
- **CODCID** - Código da cidade (PK)
- **NOMECID** - Nome da cidade
- **UF** - UF (estado)

### Como usar para corrigir o CRUD

1. Faça uma chamada para `GET /health/tgfpar-columns`
2. Compare as colunas retornadas com as usadas no `SankhyaClienteRepository`
3. Corrija os nomes das colunas no repository se necessário
4. Verifique se `DHALTER` realmente existe (esperado: `DTALTER`)
5. Teste os endpoints do CRUD após as correções

### Problemas Comuns

- **ORA-00904**: Coluna não existe na tabela
- **Nome incorreto**: Verifique exatamente como a coluna aparece no Oracle (case-sensitive)
- **Alias faltando**: Nas queries JOIN, certifique-se de usar aliases corretos (PAR, ENDP, BAI, CID)
- **Colunas AD_**: Colunas customizadas (AD_*) podem não existir em todas as instâncias

### Próximos Passos

1. Execute o servidor backend
2. Chame `GET /health/tgfpar-columns` via curl, Postman ou navegador
3. Analise as colunas retornadas
4. Corrija o `SankhyaClienteRepository` conforme necessário