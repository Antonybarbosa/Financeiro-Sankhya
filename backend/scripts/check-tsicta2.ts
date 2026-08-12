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
  if (!data.access_token) throw new Error('Falha na autenticação: ' + JSON.stringify(data));
  return data.access_token;
}

async function query(token: string, sql: string) {
  const resp = await fetch(`${GATEWAY_URL}/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Token': X_TOKEN },
    body: JSON.stringify({ serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } }),
  });
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 400) };
  }
}

async function main() {
  const token = await autenticar();
  console.log('--- com CODCTABENEF ---');
  const r1 = await query(token, `SELECT CARTEIRA, CODAGE, CONVENIO, CODCTABENEF FROM TSICTA WHERE ROWNUM <= 3`);
  console.log(JSON.stringify(r1)?.slice(0, 600));
  console.log('--- sem CODCTABENEF ---');
  const r2 = await query(token, `SELECT CARTEIRA, CODAGE, CONVENIO, DIASPROT FROM TSICTA WHERE ROWNUM <= 3`);
  console.log(JSON.stringify(r2)?.slice(0, 600));
}

main().catch((e) => { console.error(e); process.exit(1); });
