# Boletos — Visualização de Layout (BoletoViewer)

> Referência técnica da funcionalidade de boleto do Financeiro Sankhya.
> Última atualização: 07/08/2026 · Sessão 12 do `PROGRESSO.md`

---

## 1. Visão geral

Cada título de **TGFFIN** que tem boleto gerado (campos `CODIGOBARRA` + `LINHADIGITAVEL` preenchidos) pode ser aberto num popup que renderiza o boleto **Recibo do Sacado + Ficha de Compensação**, replicando o layout nativo de impressão do Sankhya (arquivos `.jrxml` da instalação).

Onde abrir:

| Local | Arquivo | Ação |
|---|---|---|
| Painel do parceiro | `frontend/components/cobranca/ParceiroDetailPanel.tsx` | Botão de boleto por título |
| Visão em tabela | `frontend/components/cobranca/views/TableView.tsx` | Botão de boleto por título |

O mesmo componente `BoletoDocumento` é usado **na tela e na impressão** (fonte única).

---

## 2. Fluxo de dados

```
Frontend (clique no botão boleto)
  → useBoleto(tituloId)                    hooks/useCobranca.ts
  → GET /api/cobranca/titulos/:id/boleto
  → SankhyaTituloRepository.findBoleto()   backend (query TGFFIN + joins)
  → BoletoDados (JSON)
  → BoletoViewer (popup)
  → BoletoDocumento (Recibo + "Corte aqui" + Ficha)
  → Impressão: renderToStaticMarkup → window.open → print()
```

---

## 3. Backend — `findBoleto` (sankhya-titulo.repository.ts)

Query com joins (todas LEFT, exceto TGFPAR):

```sql
FROM TGFFIN FIN
INNER JOIN TGFPAR PAR        ON PAR.CODPARC = FIN.CODPARC       -- sacado
LEFT JOIN TSIEND ENDP        ON ENDP.CODEND = PAR.CODEND        -- endereço sacado
LEFT JOIN TSICID CID         ON CID.CODCID = PAR.CODCID         -- cidade/UF sacado
LEFT JOIN TSIEMP CMP         ON CMP.CODEMP = FIN.CODEMP         -- cedente (empresa)
LEFT JOIN TSIEND CMPEND      ON CMPEND.CODEND = CMP.CODEND      -- endereço cedente
LEFT JOIN TSICID CMPCID      ON CMPCID.CODCID = CMP.CODCID      -- cidade/UF cedente
LEFT JOIN TSICTA CTA         ON CTA.CODCTABCOINT = FIN.CODCTABCOINT
WHERE FIN.NUFIN = :id AND FIN.RECDESP = 1 AND ROWNUM <= 1
```

Campos da TSICTA usados: `CARTEIRA`, `CODAGE`, `CONVENIO`, `DIASPROT`.

**Exemplo real (NUFIN 1990768, Bradesco):**

| Campo TGFFIN | Valor |
|---|---|
| CODBCO | `237` (Bradesco) |
| NOSSONUM | `000000109099` (12 dígitos, com prefixo) |
| CODIGOBARRA | 44 dígitos |
| LINHADIGITAVEL | `23793.20100  90000.001090  09007.626907  9 18420000102317` |
| VLRDESDOB | `1023,15` |
| NUMNOTA / NUMDUPL | `799` / vazio |

| Campo TSICTA | Valor |
|---|---|
| CARTEIRA | `9` |
| CODAGE | `3201` |
| CONVENIO | `5963400` |
| DIASPROT | `10` |

---

## 4. Modelos nativos do Sankhya (jrxml na raiz do projeto)

| Arquivo | Modelo | Status |
|---|---|---|
| `boleto_modelo.jrxml` | Modelo antigo — título "RECIBO DO PAGADOR", mini-resumo 4 colunas, valores em **Times**, grade 79/21, "CIP", Instruções com "Sujeito a protesto N dias" | ❌ substituído |
| `Boleto_Bradesco.jrxml` | Modelo **Bradesco** — "RECIBO DO SACADO", **SansSerif**, sem mini-resumo, célula "Esp.Doc." sem borda, bloco pagador único, instruções com multa/juros em R$ + SPC | ✅ **em uso** |

**Como extrair a estrutura de um jrxml** (Python + ElementTree, namespace `http://jasperreports.sourceforge.net/jasperreports`):
bandas/alturas, retângulos (células), staticText (labels), textField (expressões/valores), variáveis, fontes e imagens — tudo com posição x/y/width/height. Usar isso como fonte da verdade antes de mexer no layout.

---

## 5. Especificação do layout (Boleto_Bradesco.jrxml)

Largura do relatório ≈ 534px. **Colunas: principal x=6..436 (430px ≈ 81,9%) + totais x=437..532 (95px ≈ 18,1%)** — mesma proporção da caixa de Instruções.

### Cabeçalho
- **Recibo:** [logo] + `NOME DO BANCO` + `|237-2|` + `RECIBO DO SACADO` (à direita).
- **Ficha:** [logo] + `NOME DO BANCO` + `|237-2|` + **linha digitável** à direita.
- Logo: o nativo usa imagem (`logos/bradesco.jpg`); no app usamos placeholder com as iniciais do banco.

### Recibo (coluna principal)
1. **Caixa vazia** (12px) + **Beneficiário/CNPJ/CPF/endereço** (célula de 2 linhas com endereço do cedente embaixo).
2. Direita: **Vencimento** + **Agência/Conta** empilhados (bordas internas em alturas diferentes, como no jrxml).

### Ficha (coluna principal)
1. **Local do Pagamento:** + `Pagável preferencialmente no {Banco}.` + Vencimento.
2. **Beneficiário:** nome + `CNPJ/CPF:` + endereço + Agência/Conta.

### Linhas comuns às duas cópias

| Linha | Células |
|---|---|
| Dados | Data do Documento · Número do Documento · **Esp.Doc. (DM, SEM borda)** · Aceite (N) · Data Processamento (hoje) · Nosso Número |
| Uso do Banco | Uso do Banco (vazio) · Carteira (2 dígitos) · Espécie (R$) · Quantidade (vazio) · Valor (vazio) · **(=) Valor do Documento** |
| Instruções + totais | Instruções (esquerda) + Desconto/Abatimento · Mora/Multa · Outros Acréscimos · **(=) Valor Cobrado** (direita) |
| Pagador | Caixa única: `Pagador {nome}` / `{endereço}` / `{CEP}-{cidade}-{UF}` / `Sacador/Avalista` |
| Rodapé | Recibo: `Autenticação Mecânica` · Ficha: `Ficha de Compensação/Autenticação Mecânica` |

**Código de barras: apenas na ficha** (componentElement y=566 no jrxml).

### Regras de formatação (extraídas das expressões do jrxml)

| Campo | Regra nativa | Onde está no código |
|---|---|---|
| **Nosso Número** | `carteira(2)/NOSSONUM[:-1]-DV` — **NÃO corta o prefixo de 3 dígitos** (`000000109099` → `09/00000010909-9`) ⚠️ | `formatarNossoNumeroBradesco` (BoletoViewer) |
| **Carteira** | 1 dígito → completa com 0 (`9` → `09`) | `formatarCarteira` |
| **Agência/Conta** | `CTA.CODAGE + "/" + CTA.CODCTABENEF` — no app usa `CONVENIO` (ver pendência 7.3) | `formatarAgenciaConta` |
| **Nº Documento** | `NUMNOTA` com 6 dígitos + `" - " + DESDOBRAMENTO` (`799` → `000799`) | `numDocCompleto` |
| **Instruções** | `APÓS VENCIMENTO COBRAR MULTA DE R$ X.` / `APÓS VENCIMENTO COBRAR JUROS DE R$ Y POR DIA DE ATRASO.` / `INCLUSAO NO SPC E ENVIO AO CARTORIO NO 10º DIA DE VENCIDO.` | `gerarInstrucoes` |
| **Juros/Multa** | multa = `VLRDESDOB × 0,02`; juros/dia = `(VLRDESDOB × 0,075) / 30` | `calcularTotais` |
| **Totais** | O jrxml só preenche Valor do Documento e Desconto; o app também preenche **Mora/Multa** e **Valor Cobrado** (calculados) | `LinhaTotais` |
| **Banco 2 dígitos** | Sankhya grava `33` (Santander) sem o zero → normalizar com `padStart(3)` | `nomeBanco`/`codigoBancoDv` (lib/boleto.ts) |
| Fonte | Tudo **SansSerif**, preto no branco, labels ~7-8px, valores ~8px (escalados no app) | ST no BoletoViewer |

> ⚠️ **Prefixo do Nosso Número:** o modelo Bradesco exibe o NOSSONUM inteiro (`09/00000010909-9`). O modelo antigo cortava os 3 primeiros dígitos (`9/00010909-9`). **Decisão pendente** — se preferir sem o prefixo, é uma linha em `formatarNossoNumeroBradesco`.

---

## 6. Arquivos da funcionalidade

| Arquivo | Papel |
|---|---|
| `frontend/components/cobranca/BoletoViewer.tsx` | ⭐ Layout completo: `BoletoDocumento`, `FichaBoleto` (recibo/ficha), `TopoBanco`, `LogoBanco`, `Cell`, `LinhaTotais`, `BlocoPagador`, `BarcodeSvg`, popup `BoletoViewer`, impressão |
| `frontend/lib/boleto.ts` | Helpers: `nomeBanco`, `codigoBancoDv`, `formatarLinhaDigitavel` (47/57 dígitos), `formatarNossoNumero` (modelo antigo), `gerarCodigoDeBarras` (ITF) |
| `frontend/types/cobranca.ts` | Tipo `Boleto` (cedente, sacado, agência, convenio, juros/multa, etc.) |
| `frontend/hooks/useCobranca.ts` | `useBoleto(tituloId)` |
| `backend/src/infrastructure/repositories/sankhya-titulo.repository.ts` | `findBoleto()` + `mapToBoleto()` |
| `Boleto_Bradesco.jrxml` / `boleto_modelo.jrxml` | Modelos nativos de referência (raiz do projeto) |

---

## 7. Pendências / próximos passos

| # | Pendência | Detalhe |
|---|---|---|
| 7.1 | **Prefixo "000" do Nosso Número** | Decidir entre `09/00000010909-9` (fiel ao jrxml) e `09/00010909-9` (sem prefixo, como no modelo antigo) |
| 7.2 | **Logo do banco** | Placeholder atual = iniciais do banco; validar se serve ou trocar por imagem/abreviação oficial |
| 7.3 | **CODCTABENEF vs CONVENIO** | O jrxml usa `CTA.CODCTABENEF` para a conta; testamos `CONVENIO` (funciona). O teste via script deu 404 por bug no script (`check-tsicta2.ts` usa endpoint errado) — revisitar com o padrão do `check-tsicta.ts` |
| 7.4 | **Modelo por banco** | Hoje o layout é único (Bradesco) para todos os bancos. Opção: usar o modelo Bradesco só para CODBCO 237 e outro modelo (antigo) para os demais |
| 7.5 | **Hardcodes do jrxml** | `Esp.Doc.=DM` e `Aceite=N` são textos fixos do modelo; Nº do documento com 6 dígitos idem |
| 7.6 | **DIASPROT** | O modelo Bradesco usa o texto fixo "10º DIA" do SPC (não usa `DIASPROT`); o modelo antigo usava `DIASPROT` no "Sujeito a protesto N dias" |

---

## 8. Testes / preview

```bash
# Typecheck
cd frontend && npx tsc --noEmit

# Preview standalone (método usado nas sessões)
# 1. Criar frontend/preview-boleto.tsx com um objeto Boleto (dados reais do NUFIN 1990768)
#    e renderToStaticMarkup(<BoletoDocumento boleto={boleto}/>) gravando boleto-preview.html
# 2. Bundlar e gerar:
npx --yes esbuild preview-boleto.tsx --bundle --platform=node --jsx=automatic \
  --alias:@=./ --outfile=/tmp/preview-boleto.cjs --loader:.tsx=tsx
node /tmp/preview-boleto.cjs
# 3. Abrir boleto-preview.html no Chrome (browser-use) e conferir
# 4. Apagar os temporários (preview-boleto.tsx e boleto-preview.html)
```

**Atenção:** passar datas como `"2027-06-14T12:00:00"` (com hora) no preview — `new Date("14/06/2027")` é inválido e `new Date("2027-06-14")` desloca 1 dia no fuso BR.

No app real não há esse problema: o backend serializa `Date` em ISO completo (com hora).

---

## 9. Histórico resumido da implementação

1. **Planejamento** — levantamento de dados disponíveis (TGFFIN, TSICTA, TSIEMP) via scripts `backend/scripts/check-*`.
2. **1ª versão** — réplica do `boleto_modelo.jrxml`: RECIBO DO PAGADOR, mini-resumo com CNPJ/CPF, Times, grade 81% (alinhada à caixa de Instruções a pedido do usuário), totais sem "R$", ficha com "SUJEITO A PROTESTO.".
3. **Refinamentos** — nome do banco (código `33` → Santander), gap do "RECIBO DO PAGADOR" (1px), linha "Até o vencimento..." fundida na célula Local de Pagamento (não existe linha separada no jrxml).
4. **Reescrita (atual)** — usuário forneceu `Boleto_Bradesco.jrxml` → layout reconstruído do zero conforme seção 5.
