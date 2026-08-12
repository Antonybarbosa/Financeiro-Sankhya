import 'dotenv/config';

/**
 * Teste controlado A/B/C no mesmo registro — isola as variáveis:
 *   A. payload NATIVO completo + mgeSession
 *   B. payload SIMPLES (app atual) + mgeSession
 *   C. payload NATIVO completo SEM sessão
 *
 * Cada teste faz S→N (finalizar) e restaura N→S logo após, deixando o registro
 * sempre no estado original ao final.
 *
 * Uso:
 *   npx ts-node scripts/debug-finalizar-abc.ts [NUREL] [mgeSession]
 */

const NUREL = process.argv[2] || '361966';
const MGE_SESSION = process.argv[3] || process.env.MGE_SESSION || '';

const GATEWAY_URL = process.env.GATEWAY_URL || '';
const CLIENT_ID = process.env.GATEWAY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GATEWAY_CLIENT_SECRET || '';
const X_TOKEN = process.env.GATEWAY_X_TOKEN || '';

const CAMPOS_NATIVOS = [
  'NUREL', 'NUAVISO', 'NUMOS', 'PENDENTE', 'TIPCHAM', 'CODATENDENTE', 'Atendente.NOMEUSU',
  'CODPARC', 'Parceiro.RAZAOSOCIAL', 'TELEFONEPARC', 'CODCONTATO', 'Contato.NOMECONTATO',
  'DHCHAMADA', 'DHPROXCHAM', 'TEMPPREVISTO', 'CODUSU', 'Executante.NOMEUSU', 'CODHIST',
  'HistoricoTele.DESCRHIST', 'COMENTARIOS', 'CODPROD', 'CODVEND', 'COMENTARIOS2', 'DTALTER',
  'SITUACAO', 'AD_TIPCHAMADA', 'AD_HRCHECKOUT', 'AD_HRCHECKIN', 'AD_HISTORICO', 'AD_CHECKOUT',
  'AD_CHECKIN', 'AD_TIPO', 'AD_HISTCOBRA', 'AD_MSG',
];

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

function payloadNativo(pendente: string) {
  return {
    serviceName: 'DatasetSP.save',
    requestBody: {
      dataSetID: '00H',
      entityName: 'Relacionamento',
      standAlone: false,
      fields: CAMPOS_NATIVOS,
      records: [{ pk: { NUREL }, values: { '3': pendente } }],
      crudListener: 'br.com.sankhya.mgeserv.model.helpper.RelacionamentoCRUDListener',
      txProperties: { 'br.com.sankhya.mgecom.Telemarketing': true },
      ignoreListenerMethods: '',
      clientEventList: { clientEvent: [{ $: 'br.com.sankhya.actionbutton.clientconfirm' }] },
    },
  };
}

function payloadSimples(pendente: string) {
  return {
    serviceName: 'DatasetSP.save',
    requestBody: {
      entityName: 'Relacionamento',
      standAlone: false,
      fields: ['PENDENTE'],
      records: [{ pk: { NUREL }, values: { '0': pendente } }],
    },
  };
}

async function salvar(token: string, body: any, sessao?: string): Promise<any> {
  let url = `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json`;
  if (sessao) url += `&mgeSession=${encodeURIComponent(sessao)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return await resp.json();
}

async function lerPendente(token: string): Promise<string> {
  const qResp = await fetch(
    `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceName: 'DbExplorerSP.executeQuery',
        requestBody: { sql: `SELECT NUREL, PENDENTE FROM TGFTEL WHERE NUREL = ${NUREL}` },
      }),
    },
  );
  const qData = await qResp.json() as any;
  const meta: string[] = (qData.responseBody?.fieldsMetadata || []).map((f: any) => f.name);
  const row: any[] = qData.responseBody?.rows?.[0] || [];
  return String(row[meta.indexOf('PENDENTE')] ?? '');
}

function resumo(res: any): string {
  return res.status === '1' ? 'status=1' : `status=0 (${(res.statusMessage || '').slice(0, 50)})`;
}

async function main() {
  console.log(`=== Teste controlado A/B/C — NUREL=${NUREL} ===\n`);
  const token = await autenticar();
  console.log('Autenticado OK\n');

  const original = await lerPendente(token);
  console.log(`PENDENTE original: '${original}'\n`);

  const testes = [
    { nome: 'A. NATIVO + sessão', body: payloadNativo('N'), sessao: MGE_SESSION },
    { nome: 'B. SIMPLES + sessão', body: payloadSimples('N'), sessao: MGE_SESSION },
    { nome: 'C. NATIVO sem sessão', body: payloadNativo('N'), sessao: undefined },
  ];

  for (const t of testes) {
    // S→N
    const r1 = await salvar(token, t.body, t.sessao);
    const depoisN = await lerPendente(token);
    const okN = r1.status === '1' && depoisN === 'N';

    // Restaura N→S com o mesmo payload (ou nativo caso o teste não tenha sessão)
    const restBody = t.nome.startsWith('B') ? payloadSimples('S') : payloadNativo('S');
    await salvar(token, restBody, t.sessao);
    const depoisS = await lerPendente(token);

    console.log(`  ${t.nome.padEnd(22)} → S→N: ${resumo(r1)} ${okN ? '✅ APLICOU' : `(valor ficou '${depoisN}')`} | restaurado p/ '${depoisS}'`);
  }

  // Garante estado original
  const final = await lerPendente(token);
  console.log(`\nEstado final: PENDENTE='${final}' (original era '${original}')`);
}

main().catch((e) => {
  console.error('\nErro fatal:', e.message);
  process.exit(1);
});
