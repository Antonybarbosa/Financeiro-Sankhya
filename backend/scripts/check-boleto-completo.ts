import 'dotenv/config';

/**
 * Levantamento para o planejamento da visualização de boletos.
 * Dado um NUFIN, busca: dados do título, do sacado (TGFPAR) e tenta localizar
 * cadastro de banco (TGFBCO) — para saber o que temos e o que falta.
 *
 * Uso:
 *   npx ts-node scripts/check-boleto-completo.ts [NUFIN]
 */

const NUFIN = process.argv[2] || '1990768';

const GATEWAY_URL = process.env.GATEWAY_URL || '';
const CLIENT_ID = process.env.GATEWAY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GATEWAY_CLIENT_SECRET || '';
const X_TOKEN = process.env.GATEWAY_X_TOKEN || '';

async function autenticar(): Promise<string> {
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
  if (!data.access_token) throw new Error('Falha na autenticação');
  return data.access_token;
}

async function query(token: string, sql: string): Promise<{ meta: string[]; rows: any[][] }> {
  const resp = await fetch(
    `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } }),
    },
  );
  const data = await resp.json() as any;
  if (data.status !== '1') throw new Error(`SQL: ${data.statusMessage}`);
  const meta = (data.responseBody.fieldsMetadata || []).map((f: any) => f.name);
  return { meta, rows: data.responseBody.rows || [] };
}

function mostrar(titulo: string, meta: string[], rows: any[][]) {
  console.log(`\n=== ${titulo} ===`);
  if (rows.length === 0) { console.log('(nenhum registro)'); return; }
  console.log(meta.join(' | '));
  for (const r of rows.slice(0, 5)) console.log(r.join(' | '));
}

async function main() {
  console.log(`=== Dados para boleto — NUFIN=${NUFIN} ===\n`);
  const token = await autenticar();

  // 1. Título + dados bancários na própria TGFFIN
  const t1 = await query(token, `SELECT NUFIN, CODPARC, CODEMP, NOSSONUM, CODIGOBARRA, LINHADIGITAVEL,
    CODBCO, CODBARRA, AGENCIA_CMC7, CONTA_CMC7, NVL(EMVPIX,'') AS EMVPIX,
    TO_CHAR(DTVENC,'DD/MM/YYYY') AS DTVENC, VLRDESDOB, NUMNOTA, NUMDUPL
    FROM TGFFIN WHERE NUFIN = ${NUFIN}`);
  mostrar('TGFFIN (título)', t1.meta, t1.rows);

  if (t1.rows.length === 0) { console.log('\nNUFIN não encontrado'); return; }
  const codparc = t1.rows[0][1];
  const codemp = t1.rows[0][2];
  const codbco = t1.rows[0][7];

  // 2. Sacado — TGFPAR (+ cidade/UF via TSICID)
  const t2 = await query(token, `SELECT PAR.CODPARC, PAR.NOMEPARC, PAR.CGC_CPF, PAR.RAZAOSOCIAL,
    PAR.CODEND, PAR.NUMEND, PAR.CEP, PAR.CODCID, PAR.TELEFONE, PAR.EMAIL,
    END.ENDERECO, CID.NOMECID, CID.UF
    FROM TGFPAR PAR
    LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID
    LEFT JOIN TSICID END ON END.CODCID = PAR.CODEND
    WHERE PAR.CODPARC = ${codparc}`);
  mostrar('TGFPAR (sacado)', t2.meta, t2.rows);

  // 3. Empresa — TGFCMP (dados do cedente)
  const t3 = await query(token, `SELECT * FROM (
    SELECT CODEMP, RAZAOSOCIAL, NOMEFANT, CGC_CPF, ENDERECO, NUMEND, BAIRRO, CIDADE, UF, CEP
    FROM TGFCMP) WHERE ROWNUM <= 5`);
  mostrar('TGFCMP (empresas/cedente)', t3.meta, t3.rows);

  // 4. Banco — TGFBCO (se existir)
  try {
    const t4 = await query(token, `SELECT * FROM (
      SELECT CODBCO, NOMEBCO, CODMOD, MODALIDADE, CODBCOINT FROM TGFBCO) WHERE ROWNUM <= 10`);
    mostrar('TGFBCO (bancos)', t4.meta, t4.rows);
  } catch (e) {
    console.log('\n=== TGFBCO (bancos) ===');
    console.log(`(${(e as Error).message})`);
  }
}

main().catch((e) => {
  console.error('\nErro fatal:', e.message);
  process.exit(1);
});
