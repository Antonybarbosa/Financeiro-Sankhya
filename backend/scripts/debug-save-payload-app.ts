import 'dotenv/config';

/**
 * Diagnóstico final — reproduz os payloads EXATOS que o backend envia hoje
 * no NUREL informado, usando valores idempotentes (nada muda nos dados).
 *
 * Testa:
 *   1. save() sessão 8/9 — ['COMENTARIOS','AD_MSG','DHPROXCHAM','PENDENTE','SITUACAO']
 *   2. save() sessão 10 — ['COMENTARIOS','AD_MSG','DHPROXCHAM','PENDENTE']
 *   3. updateSituacao  — ['PENDENTE'] (sessão 10) / ['SITUACAO'] (sessão 8/9)
 *   4. marcarConcluido — ['PENDENTE']='N'
 *   5. marcarPendente  — ['PENDENTE']='S'
 *
 * Uso:
 *   npx ts-node scripts/debug-save-payload-app.ts [NUREL]
 */

const NUREL = process.argv[2] || '710435';

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

async function chamar(token: string, fields: string[], values: string[]): Promise<any> {
  const url = `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json`;
  const body = {
    serviceName: 'DatasetSP.save',
    requestBody: {
      entityName: 'Relacionamento',
      standAlone: false,
      fields,
      records: [{
        pk: { NUREL },
        values: fields.reduce((acc: any, f, i) => { acc[String(i)] = values[i]; return acc; }, {}),
      }],
    },
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json() as any;
  return data;
}

function fmt(res: any): string {
  return res.status === '1' ? '✅ ok' : `❌ ${(res.statusMessage || 'erro').slice(0, 70)}`;
}

async function main() {
  console.log(`=== Reproduzindo payloads do app — NUREL=${NUREL} (idempotente) ===\n`);
  const token = await autenticar();
  console.log('Autenticado OK\n');

  // Busca valores atuais para manter idempotência
  const q = await chamar(token, [], []); // placeholder, será usado abaixo
  void q;

  const sqlResp = await fetch(
    `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceName: 'DbExplorerSP.executeQuery',
        requestBody: { sql: `SELECT NUREL, COMENTARIOS, AD_MSG, TO_CHAR(DHPROXCHAM, 'DD/MM/YYYY HH24:MI:SS') AS DHPROXCHAM, PENDENTE, SITUACAO FROM TGFTEL WHERE NUREL = ${NUREL}` },
      }),
    },
  );
  const qData = await sqlResp.json() as any;
  const fieldsMeta: string[] = (qData.responseBody?.fieldsMetadata || []).map((f: any) => f.name);
  const row: any[] = qData.responseBody?.rows?.[0] || [];
  const atuais: Record<string, string> = {};
  fieldsMeta.forEach((name, i) => { atuais[name] = String(row[i] ?? ''); });
  console.log('Valores atuais:', JSON.stringify(atuais), '\n');

  const pend = atuais.PENDENTE || 'N';
  const sit = atuais.SITUACAO || 'P';
  const msg = atuais.AD_MSG || '';
  const coment = atuais.COMENTARIOS || '';
  const dhprox = atuais.DHPROXCHAM || '';

  const testes: { nome: string; fields: string[]; values: string[] }[] = [
    {
      nome: '1. save() sessão 8/9 (COM SITUACAO)',
      fields: ['COMENTARIOS', 'AD_MSG', 'DHPROXCHAM', 'PENDENTE', 'SITUACAO'],
      values: [coment, msg, dhprox, pend, sit],
    },
    {
      nome: '2. save() sessão 10 (SEM SITUACAO)',
      fields: ['COMENTARIOS', 'AD_MSG', 'DHPROXCHAM', 'PENDENTE'],
      values: [coment, msg, dhprox, pend],
    },
    {
      nome: '3. updateSituacao sessão 8/9 (SITUACAO)',
      fields: ['SITUACAO'],
      values: [sit],
    },
    {
      nome: '4. updateSituacao sessão 10 (PENDENTE)',
      fields: ['PENDENTE'],
      values: [pend],
    },
    {
      nome: '5. marcarConcluido (PENDENTE=N)',
      fields: ['PENDENTE'],
      values: ['N'],
    },
    {
      nome: '6. marcarPendente (PENDENTE=S)',
      fields: ['PENDENTE'],
      values: ['S'],
    },
  ];

  for (const t of testes) {
    const res = await chamar(token, t.fields, t.values);
    console.log(`  ${t.nome.padEnd(42)} → ${fmt(res)}`);
  }

  // Restaura PENDENTE original caso 5/6 tenham mudado
  if (pend !== 'N') {
    await chamar(token, ['PENDENTE'], [pend]);
  }

  console.log('\n=== FIM ===');
  console.log('Se 1 falhar e 2 passar → SITUACAO combinado era o bloqueio; verificar se o backend recarregou.');
  console.log('Se todos passarem → o erro do app vem de build antigo (dist/) ou sessão expirada no frontend.');
}

main().catch((e) => {
  console.error('\nErro fatal:', e.message);
  process.exit(1);
});
