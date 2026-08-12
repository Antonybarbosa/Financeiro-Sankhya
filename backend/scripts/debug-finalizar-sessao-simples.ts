import 'dotenv/config';

/**
 * Teste decisivo — payload SIMPLES do app + mgeSession:
 * será que fields=['PENDENTE'] com index 0 basta, ou precisa do payload nativo?
 *
 * Uso:
 *   npx ts-node scripts/debug-finalizar-sessao-simples.ts [NUREL] [mgeSession] [VALOR]
 */

const NUREL = process.argv[2] || '710435';
const MGE_SESSION = process.argv[3] || process.env.MGE_SESSION || '';
const VALOR = (process.argv[4] || 'N').toUpperCase();

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
  if (!data.access_token) throw new Error(`Falha na autenticação: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function lerValores(token: string): Promise<Record<string, string>> {
  const qResp = await fetch(
    `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceName: 'DbExplorerSP.executeQuery',
        requestBody: { sql: `SELECT NUREL, PENDENTE, SITUACAO FROM TGFTEL WHERE NUREL = ${NUREL}` },
      }),
    },
  );
  const qData = await qResp.json() as any;
  const m: Record<string, string> = {};
  (qData.responseBody?.fieldsMetadata || []).forEach((f: any, i: number) => {
    m[f.name] = String(qData.responseBody.rows[0][i] ?? '');
  });
  return m;
}

async function main() {
  console.log(`=== Payload SIMPLES + mgeSession — NUREL=${NUREL} gravar PENDENTE='${VALOR}' ===\n`);
  const token = await autenticar();
  console.log('Autenticado OK\n');

  const antes = await lerValores(token);
  console.log(`Estado antes: PENDENTE='${antes.PENDENTE || ''}' SITUACAO='${antes.SITUACAO || ''}'`);

  const urlBase = `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json`;
  const url = MGE_SESSION ? `${urlBase}&mgeSession=${encodeURIComponent(MGE_SESSION)}` : urlBase;

  // Payload simples — exatamente o que o app envia hoje via saveRecord
  const body = {
    serviceName: 'DatasetSP.save',
    requestBody: {
      entityName: 'Relacionamento',
      standAlone: false,
      fields: ['PENDENTE'],
      records: [{ pk: { NUREL }, values: { '0': VALOR } }],
    },
  };

  console.log(`save simples PENDENTE="${VALOR}":`);
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await r.json() as any;
  console.log(`   status=${d.status} msg=${d.statusMessage || '(ok)'}`);

  const depois = await lerValores(token);
  console.log(`Estado depois: PENDENTE='${depois.PENDENTE || ''}' SITUACAO='${depois.SITUACAO || ''}'`);

  const aplicou = d.status === '1' && (depois.PENDENTE || '') === VALOR;
  console.log(`\nAplicação real: ${aplicou ? '✅ VALOR APLICADO — payload simples + mgeSession basta' : '❌ não aplicou — precisa do payload nativo completo'}`);
}

main().catch((e) => {
  console.error('\nErro fatal:', e.message);
  process.exit(1);
});
