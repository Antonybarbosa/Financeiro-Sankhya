import 'dotenv/config';

const GATEWAY_URL = process.env.GATEWAY_URL || '';
const CLIENT_ID = process.env.GATEWAY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GATEWAY_CLIENT_SECRET || '';
const X_TOKEN = process.env.GATEWAY_X_TOKEN || '';

async function main() {
  console.log('Autenticando...');
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);
  const authResp = await fetch(`${GATEWAY_URL}/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Token': X_TOKEN },
    body: params.toString(),
  });
  const authData = await authResp.json() as any;
  const token = authData.access_token;

  const sql = `SELECT FIN.NUFIN, FIN.NUNOTA, FIN.NUMNOTA, FIN.SERIENOTA, FIN.DESDOBRAMENTO, FIN.CODPARC, FIN.NUMDUPL, FIN.NOSSONUM, FIN.HISTORICO, FIN.VLRDESDOB, FIN.VLRBAIXA, FIN.VLRDESC, FIN.VLRJURO, FIN.VLRMULTA, FIN.DTVENC, FIN.DTNEG, FIN.DHBAIXA, FIN.RECDESP, FIN.PROVISAO, FIN.CODIGOBARRA, FIN.LINHADIGITAVEL FROM TGFFIN FIN WHERE FIN.CODPARC = 6614 AND FIN.RECDESP = 1 AND FIN.PROVISAO <> 'S' AND FIN.DHBAIXA IS NULL AND FIN.VLRDESDOB > 0 AND NVL(FIN.VLRDESDOB, 0) - NVL(FIN.VLRBAIXA, 0) > 0 ORDER BY FIN.DTVENC ASC`;

  const resp = await fetch(`${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } }),
  });
  const data = await resp.json() as any;

  if (data.status === '0') {
    console.log('ERRO:', data.statusMessage);
    return;
  }

  const fields = data.responseBody?.fieldsMetadata?.map((f: any) => f.name) || [];
  const rows = data.responseBody?.rows || [];

  console.log(`\nLinhas: ${rows.length}\n`);
  console.log('Campos:', fields.join(', '));

  for (const row of rows) {
    console.log('\n--- TITULO ---');
    fields.forEach((field: string, i: number) => {
      console.log(`  ${field.padEnd(20)} = ${JSON.stringify(row[i])} (tipo: ${typeof row[i]})`);
    });
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
