import 'dotenv/config';

/**
 * Reproduz o payload EXATO da tela nativa Relacionamento.xhtml5 (Telemarketing)
 * capturado via fetch do navegador, incluindo mgeSession e os metadados extras.
 *
 * Uso:
 *   npx ts-node scripts/debug-finalizar-native.ts [NUREL] [mgeSession] [VALOR]
 *
 * VALOR: 'N' (finalizar) ou 'S' (marcar pendente) — gravado no index 3 (PENDENTE).
 * O script NÃO restaura: grava o valor pedido e confere a aplicação no banco.
 */

const NUREL = process.argv[2] || '710435';
const MGE_SESSION = process.argv[3] || process.env.MGE_SESSION || '';
const VALOR = (process.argv[4] || 'N').toUpperCase();

const GATEWAY_URL = process.env.GATEWAY_URL || '';
const CLIENT_ID = process.env.GATEWAY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GATEWAY_CLIENT_SECRET || '';
const X_TOKEN = process.env.GATEWAY_X_TOKEN || '';

// Lista exata de campos enviada pela tela nativa (captura real)
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

// Payload idêntico ao fetch nativo (index 3 = PENDENTE)
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
  console.log(`=== Reprodução payload nativo — NUREL=${NUREL} gravar PENDENTE='${VALOR}' ===\n`);
  const token = await autenticar();
  console.log('Autenticado OK (usuário de integração)\n');

  const antes = await lerValores(token);
  console.log(`Estado antes: PENDENTE='${antes.PENDENTE || ''}' SITUACAO='${antes.SITUACAO || ''}'`);

  if (!MGE_SESSION) {
    console.log('⚠️  Sem mgeSession — comparando com o payload atual do app');
  } else {
    console.log(`Usando mgeSession: ${MGE_SESSION.slice(0, 12)}...`);
  }
  console.log('');

  const urlBase = `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json`;
  const url = MGE_SESSION ? `${urlBase}&mgeSession=${encodeURIComponent(MGE_SESSION)}` : urlBase;

  console.log(`save nativo PENDENTE="${VALOR}" (index 3):`);
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payloadNativo(VALOR)),
  });
  const d = await r.json() as any;
  console.log(`   status=${d.status} msg=${d.statusMessage || '(ok)'}`);

  const depois = await lerValores(token);
  console.log(`Estado depois: PENDENTE='${depois.PENDENTE || ''}' SITUACAO='${depois.SITUACAO || ''}'`);

  const aplicou = d.status === '1' && (depois.PENDENTE || '') === VALOR;
  console.log(`\nAplicação real: ${aplicou ? '✅ VALOR APLICADO NO BANCO' : '❌ não aplicou (ou status de erro)'}`);
  if (d.status === '1' && (depois.PENDENTE || '') !== VALOR) {
    console.log('   → status ok mas o campo não mudou: Sankhya ignorou o valor (comportamento de campo vazio/ignorado).');
  }
}

main().catch((e) => {
  console.error('\nErro fatal:', e.message);
  process.exit(1);
});
