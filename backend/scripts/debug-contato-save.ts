import 'dotenv/config';

/**
 * Diagnóstico definitivo — "Usuário logado não tem autorização para alterar este item!"
 *
 * Uso:
 *   npx ts-node scripts/debug-contato-save.ts <NOMUSU> <INTERNO> [qtd]
 *
 * Exemplo:
 *   npx ts-node scripts/debug-contato-save.ts ANTONY "senha" 5
 *
 * Fluxo:
 *   1. Autentica OAuth (usuário de integração)
 *   2. MobileLoginSP.login (sessão fresca do usuário)
 *   3. Busca NURELs reais de TGFTEL com colunas de restrição (CODRESTR, CODATENDENTE, CODUSU)
 *   4. Para cada NUREL: testa save (a) sem sessão e (b) com mgeSession fresca
 *   5. RESTAURA o PENDENTE original após cada teste (não deixa dados alterados)
 */

const [,, nomusu, interno, qtdArg] = process.argv;
const QTD = parseInt(qtdArg || '5', 10);

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

async function chamar(token: string, serviceName: string, body: any, mgeSession?: string) {
  let url = `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=${serviceName}&outputType=json`;
  if (mgeSession) url += `&mgeSession=${encodeURIComponent(mgeSession)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json() as any;
  return { status: data.status, statusMessage: data.statusMessage };
}

function saveBody(nurel: string, pendente: string) {
  return {
    serviceName: 'DatasetSP.save',
    requestBody: {
      entityName: 'Relacionamento',
      standAlone: false,
      fields: ['PENDENTE'],
      records: [{ pk: { NUREL: nurel }, values: { '0': pendente } }],
    },
  };
}

async function main() {
  if (!nomusu || !interno) {
    console.log('Uso: npx ts-node scripts/debug-contato-save.ts <NOMUSU> <INTERNO> [qtd]');
    process.exit(1);
  }

  console.log('=== Diagnóstico DatasetSP.save — múltiplos NURELs (restaura valores) ===');
  console.log(`Usuário: ${nomusu} | Qtd: ${QTD}\n`);

  console.log('1. Autenticando OAuth...');
  const token = await autenticar();
  console.log('   OK\n');

  console.log('2. MobileLoginSP.login...');
  const loginResp = await fetch(`${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=MobileLoginSP.login&outputType=json`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceName: 'MobileLoginSP.login', requestBody: { NOMUSU: { $: nomusu }, INTERNO: { $: interno } } }),
  });
  const loginData = await loginResp.json() as any;
  if (loginData.status !== '1' || !loginData.responseBody?.jsessionid) {
    console.log('   FALHA NO LOGIN:', loginData.statusMessage || 'credenciais inválidas');
    process.exit(1);
  }
  const jsessionid = loginData.responseBody.jsessionid.$;
  console.log('   jsessionid:', jsessionid, '\n');

  console.log(`3. Buscando ${QTD} NURELs reais em TGFTEL (com restrições)...`);
  // CODRESTR não existe nesta instalação (dicionário real das 28 colunas).
  // Restrição é identificada via CODATENDENTE/CODUSU (dono do atendimento).
  const sql = `SELECT * FROM (SELECT NUREL, CODPARC, PENDENTE, SITUACAO, NVL(CODATENDENTE,0) AS CODATENDENTE, NVL(CODUSU,0) AS CODUSU FROM TGFTEL ORDER BY DHCHAMADA DESC) WHERE ROWNUM <= ${QTD}`;
  const qData = await (await fetch(`${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } }),
  })).json() as any;

  if (qData.status !== '1' || !qData.responseBody?.rows?.length) {
    console.log('   ERRO SQL:', qData.statusMessage || 'nenhum registro');
    process.exit(1);
  }
  const fields = (qData.responseBody.fieldsMetadata || []).map((f: any) => f.name);
  const rows = qData.responseBody.rows as any[][];

  console.log('\n   Registros encontrados:');
  console.log('   ' + fields.join(' | '));
  for (const r of rows) {
    console.log('   ' + r.join(' | '));
  }
  console.log('');

  console.log('4. Testando save (PENDENTE=S) e restaurando o valor original:\n');
  console.log('   NUREL      | PEND orig | sem sessão        | com mgeSession');
  console.log('   -----------|-----------|-------------------|-----------------');
  for (const r of rows) {
    const nurel = String(r[0]);
    const pendOriginal = String(r[2] ?? '');
    const fmt = (res: { status: string; statusMessage?: string }) =>
      res.status === '1' ? '✅ ok' : `❌ ${(res.statusMessage || 'erro').slice(0, 50)}`;

    const sem = await chamar(token, 'DatasetSP.save', saveBody(nurel, 'S'));
    const com = await chamar(token, 'DatasetSP.save', saveBody(nurel, 'S'), jsessionid);

    // Restaura o valor original (não deixa dados alterados)
    const rest = await chamar(token, 'DatasetSP.save', saveBody(nurel, pendOriginal || 'N'));
    const restoreMsg = rest.status === '1' ? '(restaurado)' : `⚠️ RESTAURAR FALHOU: ${rest.statusMessage}`;

    console.log(`   ${nurel.padEnd(10)} | ${pendOriginal.padEnd(9)} | ${fmt(sem).padEnd(18)} | ${fmt(com)} ${restoreMsg}`);
  }

  console.log('\n=== FIM ===');
  console.log('Interpretação:');
  console.log(' - Se TODOS passarem → o save funciona; a falha do app é de sessão (jsessionid velho no navegador) ou de NUREL específico que o app usa.');
  console.log(' - Se só ALGUNS falharem → restrição de registro (CODRESTR / CODATENDENTE / CODUSU) nesses NURELs: o registro pertence a outro usuário/perfil.');
  console.log(' - Se TODOS falharem SEM sessão mas passarem COM sessão → o usuário de integração não tem permissão; usar a sessão do usuário logado.');
}

main().catch((e) => {
  console.error('\nErro fatal:', e.message);
  process.exit(1);
});
