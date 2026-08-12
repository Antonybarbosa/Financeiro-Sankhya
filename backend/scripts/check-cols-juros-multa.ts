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

  // Colunas TGFFIN com juros/multa/desconto
  const t1 = await query(token, `SELECT * FROM TGFFIN WHERE ROWNUM <= 1`);
  const colsFin = t1.meta.filter(c => /JURO|MULT|DESC|PERC|DIAS/i.test(c));
  console.log('TGFFIN (juros/multa/desconto):', colsFin.join(', ') || '(nenhuma)');

  // Valores reais do título de teste
  const t2 = await query(token, `SELECT NUFIN, VLRJURO, VLRMULTA, VLRDESC, PERCJURO, PERCMULTA, DIASJURO, PERCDESC FROM TGFFIN WHERE NUFIN = 1990768`);
  console.log('TGFFIN NUFIN=1990768:', t2.meta.join(' | '), '->', (t2.rows[0] || []).join(' | '));

  // Colunas TSIEMP (config de boleto da empresa)
  const t3 = await query(token, `SELECT * FROM TSIEMP WHERE ROWNUM <= 1`);
  const colsEmp = t3.meta.filter(c => /JURO|MULT|DESC|BOLETO|CARTEIRA|PERC|FATOR|AGENC|CONTA|CART/i.test(c));
  console.log('TSIEMP (boleto/juros/multa):', colsEmp.join(', ') || '(nenhuma)');

  // Valores reais da empresa 10
  try {
    const t4 = await query(token, `SELECT PERCMULTA, PERCJURO, DIASJURO, PERCDESC FROM TSIEMP WHERE CODEMP = 10 AND ROWNUM <= 1`);
    console.log('TSIEMP CODEMP=10:', t4.meta.join(' | '), '->', (t4.rows[0] || []).join(' | '));
  } catch (e) { console.log('TSIEMP CODEMP=10:', (e as Error).message); }
}

main().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
