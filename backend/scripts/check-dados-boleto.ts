import 'dotenv/config';

/**
 * Verifica a disponibilidade dos dados de boleto em títulos em aberto (TGFFIN).
 *
 * Uso:
 *   npx ts-node scripts/check-dados-boleto.ts [qtd]
 */

const QTD = parseInt(process.argv[2] || '12', 10);

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

async function main() {
  console.log('=== Disponibilidade de dados de boleto (TGFFIN em aberto) ===\n');
  const token = await autenticar();

  const sql = `SELECT * FROM (
    SELECT FIN.NUFIN, FIN.CODPARC, FIN.NOSSONUM, FIN.CODIGOBARRA, FIN.LINHADIGITAVEL, FIN.CODBCO,
           TO_CHAR(FIN.DTVENC, 'DD/MM/YYYY') AS DTVENC, FIN.VLRDESDOB,
           NVL(LENGTH(FIN.CODIGOBARRA),0) AS TAM_BARRA, NVL(LENGTH(FIN.LINHADIGITAVEL),0) AS TAM_LINHA
    FROM TGFFIN FIN
    WHERE FIN.RECDESP = 1 AND FIN.PROVISAO <> 'S' AND FIN.DHBAIXA IS NULL AND FIN.VLRDESDOB > 0
      AND NVL(FIN.VLRDESDOB,0) - NVL(FIN.VLRBAIXA,0) > 0
    ORDER BY FIN.DTVENC DESC
  ) WHERE ROWNUM <= ${QTD}`;

  const resp = await fetch(
    `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } }),
    },
  );
  const data = await resp.json() as any;
  if (data.status !== '1') { console.log('ERRO:', data.statusMessage); return; }

  const meta = (data.responseBody.fieldsMetadata || []).map((f: any) => f.name);
  console.log(meta.join(' | '));
  for (const r of data.responseBody.rows) console.log(r.join(' | '));

  // Estatística geral
  const sqlStats = `SELECT
    COUNT(*) AS TOTAL,
    SUM(CASE WHEN CODIGOBARRA IS NOT NULL AND LENGTH(CODIGOBARRA) > 0 THEN 1 ELSE 0 END) AS COM_BARRA,
    SUM(CASE WHEN LINHADIGITAVEL IS NOT NULL AND LENGTH(LINHADIGITAVEL) > 0 THEN 1 ELSE 0 END) AS COM_LINHA,
    SUM(CASE WHEN NOSSONUM IS NOT NULL AND LENGTH(NOSSONUM) > 0 THEN 1 ELSE 0 END) AS COM_NOSSO
    FROM TGFFIN FIN
    WHERE FIN.RECDESP = 1 AND FIN.PROVISAO <> 'S' AND FIN.DHBAIXA IS NULL AND FIN.VLRDESDOB > 0
      AND NVL(FIN.VLRDESDOB,0) - NVL(FIN.VLRBAIXA,0) > 0`;

  const sResp = await fetch(
    `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlStats } }),
    },
  );
  const sData = await sResp.json() as any;
  if (sData.status === '1') {
    const sMeta = (sData.responseBody.fieldsMetadata || []).map((f: any) => f.name);
    console.log('\n=== Estatística geral (todos em aberto) ===');
    console.log(sMeta.join(' | '));
    for (const r of sData.responseBody.rows) console.log(r.join(' | '));
  }
}

main().catch((e) => {
  console.error('Erro fatal:', e.message);
  process.exit(1);
});
