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

  // Valores reais do título de teste
  const t1 = await query(token, `SELECT NUFIN, VLRJURO, TIPJURO, VLRMULTA, TIPMULTA, VLRDESC FROM TGFFIN WHERE NUFIN = 1990768`);
  console.log('TGFFIN NUFIN=1990768:', t1.meta.join(' | '));
  console.log('  ->', (t1.rows[0] || []).join(' | '));

  // Amostra: quantos títulos têm TIPJURO/TIPMULTA preenchidos
  const t2 = await query(token, `SELECT TIPJURO, TIPMULTA, COUNT(*) AS QTD FROM TGFFIN WHERE RECDESP = 1 GROUP BY TIPJURO, TIPMULTA`);
  console.log('\nDistribuição TIPJURO/TIPMULTA (títulos RECDESP=1):');
  for (const r of t2.rows.slice(0, 12)) console.log('  TIPJURO=' + r[0] + ' TIPMULTA=' + r[1] + ' -> ' + r[2]);

  // Colunas TSIEMP de config boleto
  const t3 = await query(token, `SELECT * FROM TSIEMP WHERE ROWNUM <= 1`);
  const colsEmp = t3.meta.filter(c => /JURO|MULT|DESC|BOLETO|CARTEIRA|AGENC|CONTA|INSTR/i.test(c));
  console.log('\nTSIEMP (boleto):', colsEmp.join(', ') || '(nenhuma)');
  try {
    const t4 = await query(token, `SELECT CODEMP, VLRMULTA, TIPMULTA, VLRJURO, TIPJURO FROM TSIEMP WHERE CODEMP = 10 AND ROWNUM <= 1`);
    console.log('TSIEMP CODEMP=10:', t4.meta.join(' | '), '->', (t4.rows[0] || []).join(' | '));
  } catch (e) { console.log('TSIEMP CODEMP=10:', (e as Error).message); }
}

main().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
