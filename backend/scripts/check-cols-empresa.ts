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

  try {
    const t1 = await query(token, `SELECT * FROM TSICMP WHERE ROWNUM <= 1`);
    console.log('TSICMP (todas):', t1.meta.join(', '));
  } catch (e) { console.log('TSICMP:', (e as Error).message); }

  // Dados reais do cedente CODEMP=10
  try {
    const t2 = await query(token, `SELECT * FROM TSICMP WHERE CODEMP = 10 AND ROWNUM <= 1`);
    if (t2.rows.length) console.log('TSICMP CODEMP=10:', t2.rows[0].join(' | '));
    else console.log('TSICMP CODEMP=10: (nenhum)');
  } catch (e) { console.log('TSICMP por CODEMP:', (e as Error).message); }

  // Sacado completo: NUFIN 1990768 -> CODPARC 40464
  try {
    const t3 = await query(token, `SELECT PAR.CODPARC, PAR.NOMEPARC, PAR.CGC_CPF, PAR.RAZAOSOCIAL,
      PAR.CODEND, PAR.NUMEND, PAR.COMPLEMENTO, PAR.CEP, PAR.CODCID,
      END.NOMEEND AS LOGRADOURO, CID.NOMECID AS CIDADE, CID.UF
      FROM TGFPAR PAR
      LEFT JOIN TSIEND END ON END.CODEND = PAR.CODEND
      LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID
      WHERE PAR.CODPARC = 40464`);
    console.log('\nSACADO 40464:', t3.meta.join(' | '));
    if (t3.rows.length) console.log(t3.rows[0].join(' | '));
  } catch (e) { console.log('SACADO:', (e as Error).message); }
}

main().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
