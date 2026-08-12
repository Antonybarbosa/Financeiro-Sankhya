import 'dotenv/config';

/**
 * Diagnóstico — "Usuário logado não tem autorização para alterar este item!"
 *
 * Testa o DatasetSP.save SEM sessão (usuário de integração OAuth) em vários
 * NURELs de TGFTEL, gravando o MESMO valor já existente (idempotente — nada
 * muda nos dados, nem se passar).
 *
 * Uso:
 *   npx ts-node scripts/debug-save-permissao.ts [qtd]        → varre os N mais recentes
 *   npx ts-node scripts/debug-save-permissao.ts 1 710435     → testa um NUREL específico
 */

const QTD = parseInt(process.argv[2] || '8', 10);
const NUREL_ALVO = process.argv[3] || null;

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

async function chamar(token: string, serviceName: string, body: any): Promise<any> {
  const url = `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=${serviceName}&outputType=json`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return await resp.json();
}

function saveBody(nurel: string, fields: string[], values: string[]) {
  return {
    serviceName: 'DatasetSP.save',
    requestBody: {
      entityName: 'Relacionamento',
      standAlone: false,
      fields,
      records: [{ pk: { NUREL: nurel }, values: fields.reduce((acc: any, f, i) => { acc[String(i)] = values[i]; return acc; }, {}) }],
    },
  };
}

async function main() {
  console.log('=== Diagnóstico de permissão — save sem sessão (idempotente) ===\n');

  console.log('1. Autenticando OAuth (usuário de integração)...');
  const token = await autenticar();
  console.log('   OK\n');

  console.log(`2. Buscando ${QTD} NURELs recentes em TGFTEL...`);
  const sql = NUREL_ALVO
    ? `SELECT NUREL, CODPARC, PENDENTE, SITUACAO, NVL(CODATENDENTE,0) AS CODATENDENTE, NVL(CODUSU,0) AS CODUSU FROM TGFTEL WHERE NUREL = ${NUREL_ALVO}`
    : `SELECT * FROM (SELECT NUREL, CODPARC, PENDENTE, SITUACAO, NVL(CODATENDENTE,0) AS CODATENDENTE, NVL(CODUSU,0) AS CODUSU FROM TGFTEL ORDER BY DHCHAMADA DESC) WHERE ROWNUM <= ${QTD}`;
  const qData = await chamar(token, 'DbExplorerSP.executeQuery', {
    serviceName: 'DbExplorerSP.executeQuery',
    requestBody: { sql },
  });
  if (qData.status !== '1' || !qData.responseBody?.rows?.length) {
    console.log('   ERRO SQL:', qData.statusMessage || 'nenhum registro');
    process.exit(1);
  }
  const fields = (qData.responseBody.fieldsMetadata || []).map((f: any) => f.name);
  const rows = qData.responseBody.rows as any[][];

  console.log('\n   Registros encontrados:');
  console.log('   ' + fields.join(' | '));
  for (const r of rows) console.log('   ' + r.join(' | '));
  console.log('');

  console.log('3. Testando save do MESMO valor (nada muda nos dados):\n');
  const resultados: any[] = [];
  for (const r of rows) {
    const nurel = String(r[0]);
    const dono = String(r[4] ?? '-');
    const pendente = String(r[2] ?? '');
    const situacao = String(r[3] ?? '');

    console.log(`   NUREL=${nurel} | DONO=${dono} | PENDENTE='${pendente}' | SITUACAO='${situacao}'`);

    // (a) PENDENTE com o mesmo valor (idempotente)
    const resPend = await chamar(token, 'DatasetSP.save', saveBody(nurel, ['PENDENTE'], [pendente || 'N']));
    const okPend = resPend.status === '1';
    console.log(`      save(PENDENTE=${pendente || 'N'})        → ${okPend ? '✅ ok' : `❌ ${(resPend.statusMessage || 'erro').slice(0, 60)}`}`);

    // (b) SITUACAO com o mesmo valor (idempotente) — só se houver valor
    if (situacao) {
      const resSit = await chamar(token, 'DatasetSP.save', saveBody(nurel, ['SITUACAO'], [situacao]));
      const okSit = resSit.status === '1';
      console.log(`      save(SITUACAO=${situacao})               → ${okSit ? '✅ ok' : `❌ ${(resSit.statusMessage || 'erro').slice(0, 60)}`}`);
    }

    resultados.push({ nurel, dono, ok: okPend, msg: resPend.statusMessage });
    console.log('');
  }

  const falhas = resultados.filter(r => !r.ok);
  const okCount = resultados.length - falhas.length;

  console.log('=== RESULTADO ===');
  console.log(`Passaram (PENDENTE): ${okCount}/${resultados.length} | Falharam: ${falhas.length}/${resultados.length}`);
  console.log('');
  if (NUREL_ALVO) console.log('Acima: resultado por campo para o NUREL alvo.');
  console.log('\nInterpretação:');
  console.log(' - Se TODOS passarem → o save funciona; o erro do app vem de sessão velha ou NUREL específico.');
  console.log(' - Se só ALGUNS falharem → restrição de registro: o registro pertence a outro usuário/perfil (CODUSU/CODATENDENTE).');
  console.log('   Soluções: (a) liberar permissão do usuário de integração no Sankhya;');
  console.log('             (b) voltar a rodar o save com a sessão do usuário logado (mgeSession fresca).');
  console.log(' - Se TODOS falharem → usuário de integração sem permissão geral; usar sessão do usuário logado.');
}

main().catch((e) => {
  console.error('\nErro fatal:', e.message);
  process.exit(1);
});
