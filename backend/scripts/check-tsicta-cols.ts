import 'dotenv/config';

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
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Token': X_TOKEN },
    body: params.toString(),
  });
  const data = await resp.json() as any;
  if (!data.access_token) throw new Error('Falha na autenticação');
  return data.access_token;
}

async function query(token: string, sql: string) {
  const resp = await fetch(`${GATEWAY_URL}/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Token': X_TOKEN },
    body: JSON.stringify({ serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } }),
  });
  const data = await resp.json() as any;
  const rows = data?.responseBody?.rows;
  if (!rows) return [];
  return rows.map((r: any) => r.fields);
}

async function main() {
  const token = await autenticar();
  const rows = await query(token, `SELECT CARTEIRA, CODAGE, CONVENIO, CODCTABENEF, DIASPROT FROM TSICTA WHERE ROWNUM <= 3`);
  console.log('TSICTA:', JSON.stringify(rows, null, 1));
}

main().catch((e) => { console.error(e); process.exit(1); });
