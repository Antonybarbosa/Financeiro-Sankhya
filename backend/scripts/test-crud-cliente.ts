/**
 * Teste do CRUD de clientes (Fase 1 + pre-checks Fase 2).
 *
 * 1. Pre-checks (read-only): conteúdo de TSICID.UF e relação bairro→cidade via TSIREG
 * 2. Create real: DatasetSP.save com payload novo (CLIENTE/ATIVO/PRAZOPAG/LIMCRED/FKs default 0)
 * 3. Verificação: query do registro criado
 * 4. Limpeza: inativa o registro de teste (SITUACAO='I')
 */
import 'dotenv/config';

const GATEWAY_URL = process.env.GATEWAY_URL || '';
const CLIENT_ID = process.env.GATEWAY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GATEWAY_CLIENT_SECRET || '';
const X_TOKEN = process.env.GATEWAY_X_TOKEN || '';

const CNPJ_TESTE = '11222333000181';

async function auth(): Promise<string> {
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);
  const resp = await fetch(`${GATEWAY_URL}/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Token': X_TOKEN },
    body: params.toString(),
  });
  const data = await resp.json() as any;
  return data.access_token;
}

async function query(token: string, sql: string): Promise<any> {
  const resp = await fetch(
    `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } }),
    },
  );
  const data = await resp.json() as any;
  if (data.status === '0') throw new Error(`Query falhou: ${data.statusMessage}`);
  const fields = (data.responseBody.fieldsMetadata || []).map((f: any) => f.name);
  return (data.responseBody.rows || []).map((r: any[]) =>
    fields.reduce((acc: any, name: string, i: number) => ({ ...acc, [name]: r[i] }), {}),
  );
}

async function save(token: string, pk: any, fields: string[], values: string[]): Promise<any> {
  const body = {
    serviceName: 'DatasetSP.save',
    requestBody: {
      entityName: 'Parceiro',
      standAlone: false,
      fields,
      records: [
        {
          pk,
          values: fields.reduce((acc, field, index) => {
            acc[index.toString()] = values[index];
            return acc;
          }, {} as any),
        },
      ],
    },
  };
  const resp = await fetch(
    `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const data = await resp.json() as any;
  if (data.status === '0') throw new Error(`Save falhou: ${data.statusMessage}`);
  return data.responseBody;
}

/** CRUDServiceProvider.save — formato alternativo para insert */
async function crudSave(token: string, valuesMap: Record<string, string>): Promise<any> {
  const body = {
    serviceName: 'CRUDServiceProvider.save',
    requestBody: {
      entity: {
        pk: { CODPARC: { $: '' } },
        values: valuesMap,
      },
    },
  };
  const resp = await fetch(
    `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.save&outputType=json`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const data = await resp.json() as any;
  if (data.status === '0') throw new Error(`CRUDServiceProvider.save falhou: ${data.statusMessage}`);
  return data.responseBody;
}

async function main() {
  const token = await auth();

  console.log('=== PRE-CHECK 1: TSICID (CODCID, NOMECID, UF, CODREG) ===');
  const cidades = await query(token, `SELECT CODCID, NOMECID, UF, CODREG FROM TSICID WHERE ROWNUM <= 5`);
  console.table(cidades);

  console.log('=== PRE-CHECK 2: TSIREG hierarquia ===');
  const regioes = await query(
    token,
    `SELECT CODREG, NOMEREG, CODREGPAI, ANALITICA, ATIVA FROM TSIREG WHERE ROWNUM <= 15`,
  );
  console.table(regioes);

  console.log('=== PRE-CHECK 3: bairro -> regiao -> cidade (mesmo CODREG?) ===');
  const bairros = await query(
    token,
    `SELECT B.CODBAI, B.NOMEBAI, B.CODREG, R.NOMEREG, R.CODREGPAI, C.NOMECID AS CIDADE_MESMA_REG
     FROM TSIBAI B
     JOIN TSIREG R ON R.CODREG = B.CODREG
     LEFT JOIN TSICID C ON C.CODREG = B.CODREG
     WHERE ROWNUM <= 10`,
  );
  console.table(bairros);

  console.log('=== PRE-CHECK 4: constraint SITUACAO + TSIUFS + valores existentes ===');
  const cons = await query(
    token,
    `SELECT constraint_name, search_condition_vc FROM all_constraints WHERE constraint_name = 'CKC_SITUACAO_TGFPAR'`,
  );
  console.table(cons);
  const situacoes = await query(token, `SELECT SITUACAO, COUNT(*) AS QTD FROM TGFPAR GROUP BY SITUACAO`);
  console.table(situacoes);
  const ufs = await query(token, `SELECT CODUF, UF FROM TSIUFS ORDER BY CODUF`);
  console.log('TSIUFS:', JSON.stringify(ufs));
  const ufCounts = await query(
    token,
    `SELECT (SELECT COUNT(*) FROM TSIUFS) AS TSIUFS, (SELECT COUNT(*) FROM TSIGUF) AS TSIGUF, (SELECT COUNT(*) FROM TSIIUF) AS TSIIUF FROM DUAL`,
  );
  console.table(ufCounts);
  const ufSamples = await query(
    token,
    `SELECT 'TSIGUF' AS TBL, CODUF, CODGUF FROM TSIGUF WHERE ROWNUM <= 5`,
  );
  console.table(ufSamples);
  const situacaoComment = await query(
    token,
    `SELECT column_name, comments FROM all_col_comments WHERE table_name = 'TGFPAR' AND column_name IN ('SITUACAO','ATIVO')`,
  );
  console.table(situacaoComment);

  console.log('=== TESTE CREATE — variações de insert ===');
  const fields = [
    'NOMEPARC', 'RAZAOSOCIAL', 'CGC_CPF', 'TIPPESSOA', 'CLIENTE', 'ATIVO',
    'TELEFONE', 'EMAIL', 'IDENTINSCESTAD', 'PRAZOPAG', 'LIMCRED',
    'CODCID', 'CODBAI', 'CODEND',
  ];
  const values = [
    'TESTE CRUD APP', 'TESTE CRUD APP LTDA', CNPJ_TESTE, 'J', 'S', 'S',
    '11999999999', 'teste@app.local', 'ISENTO', '30', '5000',
    '267', '0', '0',
  ];

  type Variacao = { nome: string; run: () => Promise<any> };
  const jaExiste = await query(token, `SELECT CODPARC FROM TGFPAR WHERE CGC_CPF = '${CNPJ_TESTE}'`);
  const variacoes: Variacao[] = jaExiste.length > 0
    ? [{ nome: 'já existe — pulando create', run: async () => 'skip' }]
    : [
        { nome: 'A. DatasetSP.save pk={CODPARC:""}', run: () => save(token, { CODPARC: '' }, fields, values) },
      ];

  let sucesso = false;
  for (const v of variacoes) {
    try {
      const result = await v.run();
      console.log(`✅ ${v.nome} — OK`);
      console.log('responseBody:', JSON.stringify(result).substring(0, 400));
      sucesso = true;
      break;
    } catch (e: any) {
      console.log(`❌ ${v.nome} — ${e.message}`);
    }
  }
  if (!sucesso) throw new Error('Todas as variações de insert falharam');

  console.log('=== VERIFICAÇÃO: registro criado ===');
  const criados = await query(
    token,
    `SELECT CODPARC, NOMEPARC, RAZAOSOCIAL, CGC_CPF, TIPPESSOA, CLIENTE, ATIVO,
            PRAZOPAG, LIMCRED, CODCID, CODBAI, CODEND, SITUACAO
     FROM TGFPAR WHERE CGC_CPF = '${CNPJ_TESTE}'`,
  );
  console.table(criados);

  if (criados.length > 0) {
    const codParc = criados[criados.length - 1].CODPARC;
    console.log(`=== LIMPEZA: inativando CODPARC=${codParc} (ATIVO='N') ===`);
    await save(token, { CODPARC: codParc }, ['ATIVO'], ['N']);
    console.log('Inativado.');
  }

  console.log('=== VALIDAÇÃO F2/F3: buscas de endereço + paginação findAll ===');

  const cidadesBusca = await query(
    token,
    `SELECT * FROM (
       SELECT CID.CODCID, CID.NOMECID, UFS.UF
       FROM TSICID CID JOIN TSIUFS UFS ON UFS.CODUF = CID.UF
       WHERE CID.CODCID > 0 AND CID.NOMECID NOT LIKE '<%'
         AND UPPER(CID.NOMECID) LIKE '%RECIF%'
       ORDER BY CID.NOMECID ASC
     ) WHERE ROWNUM <= 20`,
  );
  console.log(`cidades 'RECIF': ${cidadesBusca.length} resultados`);
  console.table(cidadesBusca.slice(0, 3));

  const bairrosBusca = await query(
    token,
    `SELECT * FROM (
       SELECT BAI.CODBAI, BAI.NOMEBAI FROM TSIBAI BAI
       WHERE BAI.CODBAI > 0 AND BAI.NOMEBAI NOT LIKE '<%'
         AND UPPER(BAI.NOMEBAI) LIKE '%BOA VIAGEM%'
       ORDER BY BAI.NOMEBAI ASC
     ) WHERE ROWNUM <= 20`,
  );
  console.log(`bairros 'BOA VIAGEM': ${bairrosBusca.length} resultados`);
  console.table(bairrosBusca.slice(0, 3));

  const lograBusca = await query(
    token,
    `SELECT * FROM (
       SELECT END$.CODEND, END$.NOMEEND FROM TSIEND END$
       WHERE END$.CODEND > 0 AND END$.NOMEEND NOT LIKE '<%'
         AND UPPER(END$.NOMEEND) LIKE '%BOA VIAGEM%'
       ORDER BY END$.NOMEEND ASC
     ) WHERE ROWNUM <= 20`,
  );
  console.log(`logradouros 'BOA VIAGEM': ${lograBusca.length} resultados`);
  console.table(lograBusca.slice(0, 3));

  const pagina1 = await query(
    token,
    `SELECT * FROM (
       SELECT inner_q.*, ROWNUM AS RN_ FROM (
         SELECT PAR.CODPARC, PAR.NOMEPARC
         FROM TGFPAR PAR
         WHERE 1=1 AND PAR.ATIVO = 'S'
         ORDER BY PAR.NOMEPARC ASC
       ) inner_q WHERE ROWNUM <= 50
     ) WHERE RN_ > 0`,
  );
  const countAtivos = await query(token, `SELECT COUNT(*) AS TOTAL FROM TGFPAR PAR WHERE 1=1 AND PAR.ATIVO = 'S'`);
  console.log(`paginação: página1=${pagina1.length} itens, total ativos=${countAtivos[0].TOTAL}`);
  console.log('primeiro/último da página:', pagina1[0]?.NOMEPARC, '/', pagina1[pagina1.length - 1]?.NOMEPARC);

  const buscaAmpliada = await query(
    token,
    `SELECT COUNT(*) AS TOTAL FROM TGFPAR PAR WHERE 1=1 AND (UPPER(PAR.NOMEPARC) LIKE '%TESTE CRUD%' OR UPPER(PAR.RAZAOSOCIAL) LIKE '%TESTE CRUD%' OR PAR.CGC_CPF LIKE '%11222333000181%')`,
  );
  console.log(`busca ampliada 'TESTE CRUD': ${buscaAmpliada[0].TOTAL} resultados`);
}

main().catch((e) => {
  console.error('Erro:', e.message);
  process.exit(1);
});
