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

async function query(token: string, sql: string): Promise<{ meta: string[]; rows: any[][] }> {
  const resp = await fetch(
    `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } }) },
  );
  const data = await resp.json() as any;
  if (data.status !== '1') throw new Error(`SQL: ${data.statusMessage}`);
  const meta = (data.responseBody.fieldsMetadata || []).map((f: any) => f.name);
  return { meta, rows: data.responseBody.rows || [] };
}

async function main() {
  const token = await autenticar();
  try {
    const t = await query(token, `SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, COMMENTS FROM ALL_TAB_COLUMNS C LEFT JOIN ALL_COL_COMMENTS CC ON CC.OWNER = C.OWNER AND CC.TABLE_NAME = C.TABLE_NAME AND CC.COLUMN_NAME = C.COLUMN_NAME WHERE C.TABLE_NAME = 'TGFFIN' AND C.COLUMN_NAME IN ('TIPJURO','TIPMULTA','VLRJURO','VLRMULTA')`);
    console.log(t.meta.join(' | '));
    for (const r of t.rows) console.log(r.join(' | '));
  } catch (e) { console.log('ERRO:', (e as Error).message); }
}

main().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
