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

  // Colunas da TSICID (cidades)
  const t1 = await query(token, `SELECT * FROM TSICID WHERE ROWNUM <= 1`);
  console.log('TSICID:', t1.meta.join(', '));

  // Colunas de endereço no TGFPAR
  const t2 = await query(token, `SELECT * FROM TGFPAR WHERE ROWNUM <= 1`);
  const endCols = t2.meta.filter(c => /END|CID|CEP|BAIRR|COMPL|LOGRAD/i.test(c));
  console.log('TGFPAR (cols de endereço):', endCols.join(', ') || '(nenhuma encontrada)');

  // Colunas TGFCMP relevantes
  const t3 = await query(token, `SELECT * FROM TGFCMP WHERE ROWNUM <= 1`);
  const cmpCols = t3.meta.filter(c => /RAZAO|FANT|CGC|CNPJ|END|CID|UF|CEP|BAIRR|NUM/i.test(c));
  console.log('TGFCMP (relevantes):', cmpCols.join(', ') || '(nenhuma)');

  // Colunas TGFBCO
  try {
    const t4 = await query(token, `SELECT * FROM TGFBCO WHERE ROWNUM <= 1`);
    const bcoCols = t4.meta.filter(c => /BCO|AGENC|CONTA|NOME|MOD|COD/i.test(c));
    console.log('TGFBCO (relevantes):', bcoCols.join(', ') || '(nenhuma)');
  } catch (e) {
    console.log('TGFBCO:', (e as Error).message);
  }
}

main().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
