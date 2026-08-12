import 'dotenv/config';

const GATEWAY_URL = process.env.GATEWAY_URL || '';
const CLIENT_ID = process.env.GATEWAY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GATEWAY_CLIENT_SECRET || '';
const X_TOKEN = process.env.GATEWAY_X_TOKEN || '';

async function main() {
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
  const token = data.access_token;

  const sql = `SELECT column_name FROM all_tab_columns WHERE table_name = 'TGFPAR' AND (column_name LIKE '%CID%' OR column_name LIKE '%END%' OR column_name LIKE '%CEP%' OR column_name LIKE '%UF%' OR column_name LIKE '%BAIRRO%' OR column_name LIKE '%CGC%' OR column_name LIKE '%RAZAO%' OR column_name LIKE '%NOME%')`;
  const qResp = await fetch(
    `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } }),
    },
  );
  const qData = await qResp.json() as any;
  console.log('Colunas TGFPAR (endereço/cidade):');
  for (const r of qData.responseBody.rows) console.log('  -', r[0]);

  const sql2 = `SELECT table_name FROM all_tab_columns WHERE column_name = 'NOMECID' AND ROWNUM <= 5`;
  const q2 = await fetch(
    `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sql2 } }),
    },
  );
  const d2 = await q2.json() as any;
  console.log('\nTabelas com NOMECID:');
  for (const r of d2.responseBody.rows) console.log('  -', r[0]);
}

main().catch((e) => {
  console.error('Erro:', e.message);
  process.exit(1);
});
