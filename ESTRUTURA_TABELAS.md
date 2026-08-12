# Estrutura das Tabelas TGFTEL, TGFFIN e TGFNFE

Levantamento obtido via `DbExplorerSP.executeQuery` no banco Oracle Sankhya (homologação).

---

## 1. TGFTEL — Chamadas / Contatos de Parceiro (28 colunas)

Entidade Sankhya: **Telefone**

Chave primária: **NUREL**

| # | Campo | Tipo | Tam/Prec | Null | Descrição |
|---|---|---|---|---|---|
| 1 | `NUREL` | NUMBER | 10,0 | N | Número único registro chamada/relacionamento (PK) |
| 2 | `CODPARC` | NUMBER | 10,0 | N | Código parceiro (FK → TGFPAR) |
| 3 | `DHCHAMADA` | DATE | 7 | N | Data/hora chamada/contato |
| 4 | `CODPROD` | NUMBER | 10,0 | Y | Código produto relacionado |
| 5 | `TIPCHAM` | VARCHAR2 | 1 | Y | Tipo chamada (domínio) |
| 6 | `CODCONTATO` | NUMBER | 5,0 | Y | Código contato no parceiro |
| 7 | `CODHIST` | NUMBER | 5,0 | Y | Código histórico (motivo) |
| 8 | `COMENTARIOS` | VARCHAR2 | 300 | Y | Comentários chamada |
| 9 | `DHPROXCHAM` | DATE | 7 | Y | Data/hora próxima chamada (agendamento) |
| 10 | `PENDENTE` | VARCHAR2 | 1 | N | Atendimento pendente (S/N) |
| 11 | `CODUSU` | NUMBER | 5,0 | N | Código usuário responsável |
| 12 | `COMENTARIOS2` | VARCHAR2 | 250 | Y | Comentários adicionais |
| 13 | `CODVEND` | NUMBER | 5,0 | Y | Código vendedor |
| 14 | `SITUACAO` | VARCHAR2 | 1 | N | Situação registro (domínio) |
| 15 | `CODATENDENTE` | NUMBER | 5,0 | N | Código atendente |
| 16 | `DTALTER` | DATE | 7 | N | Data alteração |
| 17 | `NUMOS` | NUMBER | 10,0 | Y | Número ordem serviço |
| 18 | `TEMPPREVISTO` | DATE | 7 | Y | Tempo previsto |
| 19 | `NUAVISO` | NUMBER | 10,0 | Y | Número aviso |
| 20 | `AD_TIPCHAMADA` | VARCHAR2 | 10 | Y | **AD:** Tipo chamada (customizado) |
| 21 | `AD_HRCHECKOUT` | DATE | 7 | Y | **AD:** Hora checkout |
| 22 | `AD_HRCHECKIN` | DATE | 7 | Y | **AD:** Hora checkin |
| 23 | `AD_HISTORICO` | VARCHAR2 | 10 | Y | **AD:** Código histórico (customizado) |
| 24 | `AD_CHECKOUT` | VARCHAR2 | 10 | Y | **AD:** Checkout |
| 25 | `AD_CHECKIN` | VARCHAR2 | 10 | Y | **AD:** Checkin |
| 26 | `AD_TIPO` | VARCHAR2 | 100 | Y | **AD:** Tipo (customizado) |
| 27 | `AD_HISTCOBRA` | VARCHAR2 | 10 | Y | **AD:** Histórico cobrança |
| 28 | `AD_MSG` | VARCHAR2 | 4000 | Y | **AD:** Mensagem cobrança |

### Campos relevantes para cobrança
- `NUREL` — identificador único contato
- `CODPARC` — vincula contato ao cliente/parceiro
- `DHCHAMADA` — quando contato foi feito
- `DHPROXCHAM` — agendamento próximo contato
- `PENDENTE` — se precisa retorno (S/N)
- `AD_TIPCHAMADA` / `AD_TIPO` — tipo contato (ex: WhatsApp, telefone, e-mail)
- `AD_HISTCOBRA` — histórico cobrança
- `AD_MSG` — mensagem enviada ao cliente (até 4000 chars)
- `COMENTARIOS` / `COMENTARIOS2` — observações atendente

---

## 2. TGFFIN — Títulos Financeiros (245 colunas)

Entidade Sankhya: **Financeiro**

Chave primária: **NUFIN**

### 2.1 Campos principais para gestão de cobrança

| # | Campo | Tipo | Tam/Prec | Null | Descrição |
|---|---|---|---|---|---|
| 1 | `NUFIN` | NUMBER | 10,0 | N | **PK** — Número único título financeiro |
| 2 | `CODEMP` | NUMBER | 5,0 | N | Código empresa |
| 3 | `NUMNOTA` | NUMBER | 10,0 | N | Número nota fiscal |
| 4 | `SERIENOTA` | VARCHAR2 | 3 | Y | Série nota |
| 5 | `DTNEG` | DATE | 7 | N | Data negociação (emissão título) |
| 6 | `DESDOBRAMENTO` | VARCHAR2 | 3 | Y | Desdobramento (identifica parcela: A, B, C...) |
| 7 | `DHMOV` | DATE | 7 | N | Data/hora movimentação |
| 8 | `DTVENCINIC` | DATE | 7 | Y | Data primeiro vencimento |
| 9 | `DTVENC` | DATE | 7 | Y | **Data vencimento** título |
| 10 | `DHBAIXA` | DATE | 7 | Y | Data/hora baixa (null = em aberto) |
| 13 | `CODPARC` | NUMBER | 10,0 | N | Código parceiro (FK → TGFPAR) |
| 14 | `CODTIPOPER` | NUMBER | 5,0 | N | Código tipo operação |
| 16 | `CODBCO` | NUMBER | 5,0 | N | Código banco |
| 18 | `CODNAT` | NUMBER | 10,0 | N | Código natureza financeira |
| 21 | `CODVEND` | NUMBER | 5,0 | N | Código vendedor |
| 23 | `CODTIPTIT` | NUMBER | 5,0 | N | Código tipo título |
| 24 | `NUMDUPL` | NUMBER | 10,0 | Y | Número duplicata |
| 26 | `NOSSONUM` | VARCHAR2 | 12 | Y | Nosso número (boleto bancário) |
| 27 | `HISTORICO` | VARCHAR2 | 255 | Y | Histórico/descrição título |
| 28 | `VLRDESDOB` | FLOAT | 126 | N | **Valor original** título (desdobrado) |
| 29 | `VLRVENDOR` | FLOAT | 126 | N | Valor vendor |
| 35 | `VLRDESC` | FLOAT | 126 | N | Valor desconto |
| 36 | `VLRMULTA` | FLOAT | 126 | N | Valor multa |
| 39 | `VLRJURO` | FLOAT | 126 | N | Valor juros |
| 46 | `VLRBAIXA` | FLOAT | 126 | N | **Valor baixado** (pago/recebido) |
| 49 | `RECDESP` | NUMBER | 5,0 | N | **1 = A Receber** / **-1 = A Pagar** |
| 50 | `PROVISAO` | VARCHAR2 | 1 | N | Provisão (S/N) |
| 51 | `ORIGEM` | VARCHAR2 | 1 | N | Origem título |
| 53 | `NUNOTA` | NUMBER | 10,0 | Y | Número único nota (FK → TGFCAB) |
| 59 | `DTENTSAI` | DATE | 7 | Y | Data entrada/saída |
| 69 | `CODBARRA` | VARCHAR2 | 50 | Y | Código barras boleto |
| 73 | `CODIGOBARRA` | VARCHAR2 | 55 | Y | Código barras completo |
| 74 | `LINHADIGITAVEL` | VARCHAR2 | 57 | Y | Linha digitável boleto |
| 101 | `CODUSUCOBR` | NUMBER | 5,0 | Y | Código usuário cobrança |
| 100 | `PDD` | VARCHAR2 | 1 | Y | Provisão débito duvidoso (S/N) |
| 165 | `CODREGUA` | NUMBER | 10,0 | Y | Código régua cobrança |
| 245 | `AD_DESCONTADO` | VARCHAR2 | 100 | Y | **AD:** Informação desconto |

### 2.2 Regras de status (derivado — TGFFIN sem campo status direto)

| Condição | Status |
|---|---|
| `DHBAIXA IS NULL` AND `DTVENC < SYSDATE` AND `RECDESP = 1` | **VENCIDO** |
| `DHBAIXA IS NULL` AND `DTVENC >= SYSDATE` AND `RECDESP = 1` | **PENDENTE (a vencer)** |
| `DHBAIXA IS NOT NULL` AND `VLRBAIXA >= VLRDESDOB` | **BAIXADO / PAGO** |
| `DHBAIXA IS NOT NULL` AND `VLRBAIXA < VLRDESDOB` | **BAIXA PARCIAL** |
| `PROVISAO = 'S'` | **PROVISÃO** |

### 2.3 Campos de valores importantes

| Campo | Descrição |
|---|---|
| `VLRDESDOB` | Valor original título (sempre positivo) |
| `VLRBAIXA` | Valor efetivamente baixado (pago/recebido) |
| `VLRDESC` | Valor desconto concedido |
| `VLRJURO` | Valor juros cobrados |
| `VLRMULTA` | Valor multa aplicada |
| `RECDESP` | Sentido: 1 = a receber cliente, -1 = a pagar fornecedor |

### 2.4 Lista completa de todos os 245 campos

<details>
<summary>Clique para expandir a lista completa</summary>

| # | Campo | Tipo | Tam/Prec | Null |
|---|---|---|---|---|
| 1 | NUFIN | NUMBER | 10,0 | N |
| 2 | CODEMP | NUMBER | 5,0 | N |
| 3 | NUMNOTA | NUMBER | 10,0 | N |
| 4 | SERIENOTA | VARCHAR2 | 3 | Y |
| 5 | DTNEG | DATE | 7 | N |
| 6 | DESDOBRAMENTO | VARCHAR2 | 3 | Y |
| 7 | DHMOV | DATE | 7 | N |
| 8 | DTVENCINIC | DATE | 7 | Y |
| 9 | DTVENC | DATE | 7 | Y |
| 10 | DHBAIXA | DATE | 7 | Y |
| 11 | DTCONTAB | DATE | 7 | Y |
| 12 | DTCONTABBAIXA | DATE | 7 | Y |
| 13 | CODPARC | NUMBER | 10,0 | N |
| 14 | CODTIPOPER | NUMBER | 5,0 | N |
| 15 | DHTIPOPER | DATE | 7 | N |
| 16 | CODBCO | NUMBER | 5,0 | N |
| 17 | CODCTABCOINT | NUMBER | 5,0 | Y |
| 18 | CODNAT | NUMBER | 10,0 | N |
| 19 | CODCENCUS | NUMBER | 10,0 | N |
| 20 | CODPROJ | NUMBER | 10,0 | Y |
| 21 | CODVEND | NUMBER | 5,0 | N |
| 22 | CODMOEDA | NUMBER | 5,0 | N |
| 23 | CODTIPTIT | NUMBER | 5,0 | N |
| 24 | NUMDUPL | NUMBER | 10,0 | Y |
| 25 | DESDOBDUPL | VARCHAR2 | 3 | Y |
| 26 | NOSSONUM | VARCHAR2 | 12 | Y |
| 27 | HISTORICO | VARCHAR2 | 255 | Y |
| 28 | VLRDESDOB | FLOAT | 126 | N |
| 29 | VLRVENDOR | FLOAT | 126 | N |
| 30 | VLRIRF | FLOAT | 126 | N |
| 31 | VLRISS | FLOAT | 126 | N |
| 32 | VLRCHEQUE | FLOAT | 126 | Y |
| 33 | DESPCART | FLOAT | 126 | N |
| 34 | ISSRETIDO | VARCHAR2 | 1 | N |
| 35 | VLRDESC | FLOAT | 126 | N |
| 36 | VLRMULTA | FLOAT | 126 | N |
| 37 | VLRINSS | FLOAT | 126 | N |
| 38 | TIPMULTA | VARCHAR2 | 1 | Y |
| 39 | VLRJURO | FLOAT | 126 | N |
| 40 | TIPJURO | VARCHAR2 | 1 | Y |
| 41 | BASEICMS | FLOAT | 126 | N |
| 42 | ALIQICMS | FLOAT | 126 | N |
| 43 | CODEMPBAIXA | NUMBER | 5,0 | Y |
| 44 | CODTIPOPERBAIXA | NUMBER | 5,0 | N |
| 45 | DHTIPOPERBAIXA | DATE | 7 | N |
| 46 | VLRBAIXA | FLOAT | 126 | N |
| 47 | NUMREMESSA | NUMBER | 10,0 | Y |
| 48 | AUTORIZADO | VARCHAR2 | 1 | N |
| 49 | RECDESP | NUMBER | 5,0 | N |
| 50 | PROVISAO | VARCHAR2 | 1 | N |
| 51 | ORIGEM | VARCHAR2 | 1 | N |
| 52 | TIPMARCCHEQ | VARCHAR2 | 1 | N |
| 53 | NUNOTA | NUMBER | 10,0 | Y |
| 54 | NUBCO | NUMBER | 10,0 | Y |
| 55 | NUDEV | NUMBER | 10,0 | Y |
| 56 | NURENEG | NUMBER | 10,0 | Y |
| 57 | CARTA | NUMBER | 5,0 | Y |
| 58 | RATEADO | VARCHAR2 | 1 | N |
| 59 | DTENTSAI | DATE | 7 | Y |
| 60 | CODUSUBAIXA | NUMBER | 5,0 | Y |
| 61 | VLRPROV | NUMBER | 10,2 | N |
| 62 | IRFRETIDO | VARCHAR2 | 1 | Y |
| 63 | INSSRETIDO | VARCHAR2 | 1 | N |
| 64 | CARTAODESC | FLOAT | 126 | Y |
| 65 | DTALTER | DATE | 7 | N |
| 66 | NUMCONTRATO | NUMBER | 10,0 | N |
| 67 | ORDEMCARGA | NUMBER | 10,0 | N |
| 68 | CODVEICULO | NUMBER | 10,0 | N |
| 69 | CODBARRA | VARCHAR2 | 50 | Y |
| 70 | CODUSU | NUMBER | 5,0 | N |
| 71 | SEQUENCIA | NUMBER | 10,0 | Y |
| 72 | VLRVARCAMBIAL | FLOAT | 126 | Y |
| 73 | CODIGOBARRA | VARCHAR2 | 55 | Y |
| 74 | LINHADIGITAVEL | VARCHAR2 | 57 | Y |
| 75 | VLRDESCEMBUT | FLOAT | 126 | Y |
| 76 | VLRJUROEMBUT | FLOAT | 126 | Y |
| 77 | VLRMULTAEMBUT | FLOAT | 126 | Y |
| 78 | VLRMOEDA | FLOAT | 126 | Y |
| 79 | VLRMOEDABAIXA | FLOAT | 126 | Y |
| 80 | NUCOMPENS | NUMBER | 10,0 | Y |
| 81 | CODCFO | NUMBER | 10,0 | Y |
| 82 | VLRMULTANEGOC | FLOAT | 126 | Y |
| 83 | VLRJURONEGOC | FLOAT | 126 | Y |
| 84 | VLRMULTALIB | FLOAT | 126 | Y |
| 85 | VLRJUROLIB | FLOAT | 126 | Y |
| 86 | DTBAIXAPREV | DATE | 7 | Y |
| 87 | NUMOS | NUMBER | 10,0 | Y |
| 88 | NATUREZAOPERDES | VARCHAR2 | 2 | Y |
| 89 | SERIENFDES | VARCHAR2 | 4 | Y |
| 90 | MODELONFDES | VARCHAR2 | 2 | Y |
| 91 | CODFUNC | NUMBER | 10,0 | Y |
| 92 | CODCONTATO | NUMBER | 5,0 | Y |
| 93 | NUAPONTA | NUMBER | 10,0 | Y |
| 94 | NUMBOR | NUMBER | 10,0 | Y |
| 95 | M2 | FLOAT | 126 | Y |
| 96 | DIGSAFRA | VARCHAR2 | 1 | Y |
| 97 | NFENTSEQFIX | VARCHAR2 | 15 | Y |
| 98 | NFCOMPLFIX | NUMBER | 10,0 | Y |
| 99 | CODPARCRESP | NUMBER | 10,0 | Y |
| 100 | PDD | VARCHAR2 | 1 | Y |
| 101 | CODUSUCOBR | NUMBER | 5,0 | Y |
| 102 | NUIMP | NUMBER | 10,0 | Y |
| 103 | NUMNFSE | VARCHAR2 | 20 | Y |
| 104 | VLRALIBERAR | FLOAT | 126 | Y |
| 105 | CONVENIO | FLOAT | 126 | Y |
| 106 | CHAVECTE | VARCHAR2 | 44 | Y |
| 107 | CHAVECTEREF | VARCHAR2 | 44 | Y |
| 108 | NOMEEMITENTE_CMC7 | VARCHAR2 | 160 | Y |
| 109 | CODRATEIO | NUMBER | 10,0 | Y |
| 110 | VLRCESSAO | FLOAT | 126 | Y |
| 111 | IDLOTEFDIC | NUMBER | 10,0 | Y |
| 112 | NRODOCTEF | NUMBER | 10,0 | Y |
| 113 | NUPED | NUMBER | 10,0 | Y |
| 114 | CODBCO_CMC7 | NUMBER | 5,0 | Y |
| 115 | AGENCIA_CMC7 | VARCHAR2 | 5 | Y |
| 116 | CONTA_CMC7 | VARCHAR2 | 14 | Y |
| 117 | CGC_CPF_CMC7 | VARCHAR2 | 14 | Y |
| 118 | CODCC | NUMBER | 10,0 | Y |
| 119 | VLRFATCARTAO | FLOAT | 126 | Y |
| 120 | NUCCR | NUMBER | 10,0 | Y |
| 121 | EXIGEISSQN | VARCHAR2 | 2 | Y |
| 122 | REGESPTRIBUT | VARCHAR2 | 2 | Y |
| 123 | SITESPECIALRESP | VARCHAR2 | 2 | Y |
| 124 | MOTNAORETERISSQN | VARCHAR2 | 2 | Y |
| 125 | NROLOTEGNRE | NUMBER | 10,0 | Y |
| 126 | STATUSGNRE | VARCHAR2 | 50 | Y |
| 127 | REJEICAOGNRE | VARCHAR2 | 500 | Y |
| 128 | NUFTC | NUMBER | 10,0 | Y |
| 129 | PARCRENEG | VARCHAR2 | 20 | Y |
| 130 | CODCARTAO | VARCHAR2 | 50 | Y |
| 131 | TPAGNFCE | VARCHAR2 | 2 | Y |
| 132 | VALORPRESENTE | FLOAT | 126 | Y |
| 133 | JUROSAVP | FLOAT | 126 | Y |
| 134 | BLOQVAR | CHAR | 1 | Y |
| 135 | VLRFRETENFS | FLOAT | 126 | Y |
| 136 | VLRDESCCALC | FLOAT | 126 | Y |
| 137 | VLRHONOR | FLOAT | 126 | Y |
| 138 | BASEIRF | FLOAT | 126 | Y |
| 139 | BASEINSS | FLOAT | 126 | Y |
| 140 | MONIOCOREM | CHAR | 1 | Y |
| 141 | NSUECONECT | VARCHAR2 | 20 | Y |
| 142 | DTPRAZO | DATE | 7 | Y |
| 143 | VLRTROCOECONECT | FLOAT | 126 | Y |
| 144 | TIPOTROCOECONECT | CHAR | 1 | Y |
| 145 | RECEBCARTAO | VARCHAR2 | 1 | Y |
| 146 | ABATIMENTO | FLOAT | 126 | Y |
| 147 | ABATIMENTOCAN | FLOAT | 126 | Y |
| 148 | VLRDESCSSPMB | FLOAT | 126 | Y |
| 149 | AD_LINHADIGITAVEL | VARCHAR2 | 100 | Y |
| 150 | TIPOABATSSPMB | CHAR | 1 | Y |
| 151 | CODCBE | NUMBER | 10,0 | Y |
| 152 | DESPADVOGADO | CHAR | 1 | Y |
| 153 | CUSTASPROCESSUAIS | CHAR | 1 | Y |
| 154 | DEPOSITOJUDICIAL | CHAR | 1 | Y |
| 155 | NUMPROCADMJUDIC | VARCHAR2 | 21 | Y |
| 156 | OBRACONSTCIVIL | NUMBER | 5,0 | Y |
| 157 | CLASSIFCESSAOOBRA | NUMBER | 10,0 | Y |
| 158 | CODLST | NUMBER | 10,0 | Y |
| 159 | CODTRIB | NUMBER | 5,0 | Y |
| 160 | CODCIDINICTE | NUMBER | 5,0 | Y |
| 161 | CODCIDFIMCTE | NUMBER | 5,0 | Y |
| 162 | CODOBRA | VARCHAR2 | 15 | Y |
| 163 | CHEQUERASTREADO_CMC7 | VARCHAR2 | 1 | Y |
| 164 | NUCHQ | NUMBER | 10,0 | Y |
| 165 | CODREGUA | NUMBER | 10,0 | Y |
| 166 | SEQCAIXA | NUMBER | 5,0 | Y |
| 167 | IDUNICO | NUMBER | 10,0 | Y |
| 168 | TIMPARCELA | NUMBER | 5,0 | Y |
| 169 | TIMCONTRATOLOC | NUMBER | 10,0 | Y |
| 170 | TIMNEGOCIACAO | NUMBER | 10,0 | Y |
| 171 | TIMDTIMPBOL | DATE | 7 | Y |
| 172 | TIMDTREPASSE | DATE | 7 | Y |
| 173 | TIMDHBAIXA | DATE | 7 | Y |
| 174 | TIMDATADEJUR | DATE | 7 | Y |
| 175 | TIMNUMREG | NUMBER | 10,0 | Y |
| 176 | TIMORIGEM | VARCHAR2 | 2 | Y |
| 177 | TIMNUFINORIG | NUMBER | 10,0 | Y |
| 178 | TIMVENDAIMV | NUMBER | 10,0 | Y |
| 179 | TIMRENEGIMV | NUMBER | 10,0 | Y |
| 180 | TIMVENDALOTE | NUMBER | 10,0 | Y |
| 181 | TIMRENEGLOTE | NUMBER | 10,0 | Y |
| 182 | TIMSAC | NUMBER | 10,0 | Y |
| 183 | TIMNOMEADVOGADO | VARCHAR2 | 200 | Y |
| 184 | TIMDHGERREPASSE | DATE | 7 | Y |
| 185 | TIMCONTAREP | NUMBER | 10,0 | Y |
| 186 | TIMIMOVEL | NUMBER | 10,0 | Y |
| 187 | TIMCONTRATOADM | NUMBER | 10,0 | Y |
| 188 | TIMBLOQUEADA | CHAR | 1 | Y |
| 189 | TIMFECHAMENTOALU | NUMBER | 10,0 | Y |
| 190 | TIMDTIMPBOLLOCAL | DATE | 7 | Y |
| 191 | TIMFECHAMENTO | NUMBER | 5,0 | Y |
| 192 | TIMRENEGCANCLOTE | NUMBER | 10,0 | Y |
| 193 | TIMCONTRATOLTV | NUMBER | 10,0 | Y |
| 194 | TIMRESCISAOLTV | NUMBER | 5,0 | Y |
| 195 | TIMNUNOTA | NUMBER | 12,0 | Y |
| 196 | TIMCONTALANC | NUMBER | 10,0 | Y |
| 197 | TIMTXADMGERALU | CHAR | 1 | Y |
| 198 | TIMFINGARANTORIG | NUMBER | 10,0 | Y |
| 199 | TIMREPINTELIGENTE | NUMBER | 10,0 | Y |
| 200 | TIMDHGERREPPARCIAL | DATE | 7 | Y |
| 201 | TIMDTREPPARCIAL | DATE | 7 | Y |
| 202 | TIMREPPARCIAL | CHAR | 1 | Y |
| 203 | TIMVLRJUROCONTRATO | NUMBER | 10,2 | Y |
| 204 | TIMVLRAMORTCONTRATO | NUMBER | 10,2 | Y |
| 205 | TIMVLRCORRMONET | NUMBER | 10,2 | Y |
| 206 | CODIPTU | NUMBER | 10,0 | Y |
| 207 | TIMORIGRENEG | CHAR | 1 | Y |
| 208 | TIMRESCISAOLOC | NUMBER | 10,0 | Y |
| 209 | TIMTIPOINTERMED | NUMBER | 10,0 | Y |
| 210 | CODOBSPADRAO | NUMBER | 5,0 | Y |
| 211 | CODIMOVELRURAL | NUMBER | 5,0 | Y |
| 212 | RECADIANTAMENTORURAL | VARCHAR2 | 1 | Y |
| 213 | NUCKC | NUMBER | 10,0 | Y |
| 214 | CHAVENFEGNRE | VARCHAR2 | 44 | Y |
| 215 | NUANTBANC | NUMBER | 10,0 | Y |
| 216 | DTENTSAIINFO | DATE | 7 | Y |
| 217 | NUMDOCARRECAD | VARCHAR2 | 30 | Y |
| 218 | REFATCON | DATE | 7 | Y |
| 219 | FINCONFIRMADO | CHAR | 1 | Y |
| 220 | TIPAPURACAO | VARCHAR2 | 1 | Y |
| 221 | VLRGNREDOIS | FLOAT | 126 | Y |
| 222 | DESCRTPAGNFCE | VARCHAR2 | 60 | Y |
| 223 | RECEBIDO | CHAR | 1 | Y |
| 224 | EMVPIX | VARCHAR2 | 1000 | Y |
| 225 | TROCOPDV | FLOAT | 126 | Y |
| 226 | DTINITREFAPURACAO | DATE | 7 | Y |
| 227 | DHINTEGRACAO | DATE | 7 | Y |
| 228 | INDRECEFDCONT | VARCHAR2 | 2 | Y |
| 229 | INFCOMPLEFDCONT | VARCHAR2 | 255 | Y |
| 230 | DTREFERENCIA | DATE | 7 | Y |
| 231 | CODRECEITA | VARCHAR2 | 10 | Y |
| 232 | DTINTEGRACAOIPI | DATE | 7 | Y |
| 233 | NUVERBA | NUMBER | -,0 | Y |
| 234 | VLRDESDOBCALC | FLOAT | 126 | Y |
| 235 | PIXTEF | NUMBER | 10,0 | Y |
| 236 | BAIXAAPI | VARCHAR2 | 255 | Y |
| 237 | VENDAMAIS | CHAR | 1 | Y |
| 238 | DH_IMPRESSAO | DATE | 7 | Y |
| 239 | NROIMPORT | NUMBER | -,0 | Y |
| 240 | NUCAIXA | NUMBER | 10,0 | Y |
| 241 | SANGDESPDV | VARCHAR2 | 1 | Y |
| 242 | NUMOCORRENCIAS | VARCHAR2 | 255 | Y |
| 243 | VLRICMSXMLCTE | FLOAT | 126 | Y |
| 244 | METODOCALCIRRF | VARCHAR2 | 1 | Y |
| 245 | AD_DESCONTADO | VARCHAR2 | 100 | Y |

</details>

---

## 3. Mapeamento Entidade → Tabela (atualizado)

| Entidade (API) | Tabela (banco) | PK | Uso no sistema |
|---|---|---|---|
| **Financeiro** | **TGFFIN** | NUFIN | Títulos financeiros (parcelas, duplicatas, contas pagar/receber) |
| **Telefone** | **TGFTEL** | NUREL | Registro chamadas/contatos com parceiros |
| **NFE** | **TGFNFE** | NUNOTA | XML Nota Fiscal Eletrônica (NFE/NFC-e) pra DANFE |
| CabecalhoNota | TGFCAB | NUNOTA | Cabeçalho notas fiscais |
| Parceiro | TGFPAR | CODPARC | Clientes e fornecedores |
| Endereço (logradouro) | TSIEND | CODEND | Nomes de logradouro (rua, av, etc.) — referenciado por TGFPAR.CODEND |
| Bairro | TSIBAI | CODBAI | Nomes de bairro — referenciado por TGFPAR.CODBAI |
| Cidade | TSICID | CODCID | Cidade + UF — referenciado por TGFPAR.CODCID |
| Empresa | TSIEMP | CODEMP | Dados da empresa (cedente boleto) — referenciado por TGFFIN.CODEMP |
| Conta Bancária | TSICTA | CODCTABCOINT | Conta/carteira boleto — referenciado por TGFFIN.CODCTABCOINT |

> **Correção importante:** Código anterior consultava `TGFCAB` (CabecalhoNota) pra títulos financeiros. Correto é usar **TGFFIN** (Financeiro), que contém parcelas/duplicatas com vencimento, valor, baixa, etc.

### 3.1. Tabelas auxiliares TSI* — estrutura de endereço/parceiro

O endereço completo do parceiro é obtido com 3 LEFT JOINs a partir de `TGFPAR`:

```sql
FROM TGFPAR PAR
LEFT JOIN TSIEND ENDP ON ENDP.CODEND = PAR.CODEND    -- logradouro (NOMEEND)
LEFT JOIN TSIBAI BAI  ON BAI.CODBAI  = PAR.CODBAI     -- bairro (NOMEBAI)
LEFT JOIN TSICID CID  ON CID.CODCID  = PAR.CODCID     -- cidade/UF (NOMECID, UF)
```

Campos relevantes de `TGFPAR` para endereço:
- `CODEND` (FK → `TSIEND.CODEND`)
- `CODBAI` (FK → `TSIBAI.CODBAI`)
- `CODCID` (FK → `TSICID.CODCID`)
- `NUMEND` (número — string livre)
- `COMPLEMENTO`
- `CEP`

> **Atenção:** `TGFPAR` **NÃO** tem coluna `BAIRRO`. Bairro sempre vem via JOIN em `TSIBAI.NOMEBAI`. Usar `PAR.BAIRRO` gera `ORA-00904`.

`TSIBAI` tem 7 colunas: `CODBAI` (PK), `NOMEBAI`, `CODREG`, `DTALTER`, `DESCRICAOCORREIO`, `NUVERSAO`, `ATUNUVERSAO`.

---

## 3. TGFNFE — Nota Fiscal Eletrônica / XML (26 colunas)

Entidade Sankhya: **NFE**

Chave primária: **NUNOTA** (FK → TGFCAB.NUNOTA)

| # | Campo | Tipo | Tam | Null | Descrição |
|---|---|---|---|---|---|
| 1 | `NUNOTA` | NUMBER | 10,0 | N | **PK** — Número único nota (FK → TGFCAB) |
| 2 | `CHAVENFE` | VARCHAR2 | 44 | Y | **Chave acesso** NFE (44 dígitos) |
| 3 | `XML` | CLOB | 4000 | Y | **XML NFE** (documento principal pra DANFE) |
| 4 | `XMLPROTAUTNOT` | CLOB | 4000 | Y | XML protocolo autorização nota |
| 5 | `XMLENVCLI` | CLOB | 4000 | Y | XML enviado ao cliente |
| 6 | `XMLCANC` | CLOB | 4000 | Y | XML cancelamento |
| 7 | `XMLPROTCANC` | CLOB | 4000 | Y | XML protocolo cancelamento |
| 8 | `XMLENVCLICANC` | CLOB | 4000 | Y | XML cancelamento enviado ao cliente |
| 9 | `XMLENVCARTA` | CLOB | 4000 | Y | XML carta correção |
| 10 | `XMLPROTAUTCARTA` | CLOB | 4000 | Y | Protocolo autorização carta correção |
| 11 | `XMLENVCLICARTA` | CLOB | 4000 | Y | Carta correção enviada ao cliente |
| 12 | `QRCODE` | VARCHAR2 | 4000 | Y | QR Code (NFC-e — link consulta) |
| 13 | `XMLENVEPEC` | CLOB | 4000 | Y | XML EPEC (Evento Prévio Emissão Contingência) |
| 14 | `XMLPROTAUTEPEC` | CLOB | 4000 | Y | Protocolo autorização EPEC |
| 15 | `XMLENVCANCPRORROG` | CLOB | 4000 | Y | XML cancelamento prorrogação |
| 16 | `XMLENVCLICANCPRORROG` | CLOB | 4000 | Y | Cancelamento prorrogação enviado ao cliente |
| 17 | `XMLPROTAUTCANCPRORROG` | CLOB | 4000 | Y | Protocolo cancelamento prorrogação |
| 18 | `XMLENVCLIPRORROG` | CLOB | 4000 | Y | Prorrogação enviada ao cliente |
| 19 | `XMLENVPRORROG` | CLOB | 4000 | Y | XML prorrogação (Sefaz) |
| 20 | `XMLPROTAUTPRORROG` | CLOB | 4000 | Y | Protocolo autorização prorrogação |
| 21 | `XMLENVCLICANCCONF` | CLOB | 4000 | Y | Cancelamento confirmação enviado ao cliente |
| 22 | `XMLENVECONF` | CLOB | 4000 | Y | XML ECONF (Evento Confirmação) |
| 23 | `XMLENVCANCCONF` | CLOB | 4000 | Y | XML cancelamento confirmação |
| 24 | `XMLPROTAUTCANCCONF` | CLOB | 4000 | Y | Protocolo cancelamento confirmação |
| 25 | `XMLENVCLIECONF` | CLOB | 4000 | Y | ECONF enviado ao cliente |
| 26 | `XMLPROTAUTECONF` | CLOB | 4000 | Y | Protocolo autorização ECONF |

### Campos relevantes para visualização de DANFE
- `NUNOTA` — vincula com `TGFFIN.NUNOTA` (cada título financeiro tem nota origem)
- `CHAVENFE` — chave acesso 44 dígitos (consulta SEFAZ)
- `XML` — XML completo NFE (emitente, destinatário, itens, totais, impostos)
- `QRCODE` — URL QR Code (NFC-e varejo)

### Fluxo de consulta: Título → DANFE
```
TGFFIN.NUNOTA → TGFNFE.NUNOTA → TGFNFE.XML (CLOB) → parse XML → renderizar DANFE
```
