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
    const t1 = await query(token, `SELECT * FROM TSICTA WHERE ROWNUM <= 1`);
    const cols = t1.meta.filter(c => /PROT|CART|AGEN|CODCTABCO|DESCRI/i.test(c));
    console.log('TSICTA existe. Colunas relevantes:', cols.join(', ') || t1.meta.join(', '));
    if (t1.rows.length) console.log('Exemplo:', t1.rows[0].join(' | '));
    // DIASPROT da conta do título de teste (CODCTABCOINT)
    const t2 = await query(token, `SELECT FIN.CODCTABCOINT, CTA.CODCTABCOINT AS CTA_COD, CTA.DIASPROT, CTA.CARTEIRA, CTA.CODAGE, CTA.CONVENIO FROM TGFFIN FIN LEFT JOIN TSICTA CTA ON CTA.CODCTABCOINT = FIN.CODCTABCOINT WHERE FIN.NUFIN = 1990768`);
    console.log('\nTítulo 1990768 + TSICTA:', t2.meta.join(' | '));
    console.log((t2.rows[0] || []).join(' | '));
  } catch (e) { console.log('TSICTA:', (e as Error).message); }
}

main().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
