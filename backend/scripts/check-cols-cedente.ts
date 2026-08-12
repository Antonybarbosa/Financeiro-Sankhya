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

async function main() {
  const token = await autenticar();

  const t1 = await query(token, `SELECT * FROM TGFCMP WHERE ROWNUM <= 1`);
  console.log('TGFCMP (todas):', t1.meta.join(', '));

  try {
    const t2 = await query(token, `SELECT * FROM TSIEND WHERE ROWNUM <= 1`);
    console.log('TSIEND (todas):', t2.meta.join(', '));
    if (t2.rows.length) console.log('TSIEND exemplo:', t2.rows[0].join(' | '));
  } catch (e) {
    console.log('TSIEND:', (e as Error).message);
  }

  // Dados reais do cedente (CODEMP=10)
  try {
    const t3 = await query(token, `SELECT * FROM TGFCMP WHERE CODEMP = 10 AND ROWNUM <= 1`);
    if (t3.rows.length) console.log('TGFCMP CODEMP=10:', t3.rows[0].join(' | '));
  } catch (e) {
    console.log('TGFCMP por CODEMP:', (e as Error).message);
  }
}

main().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
