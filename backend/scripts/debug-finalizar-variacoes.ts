import 'dotenv/config';

/**
 * Bateria de testes — finalizar atendimento (PENDENTE S→N) na TGFTEL.
 *
 * O padrão atual (DatasetSP.save, entityName='Relacionamento', fields=['PENDENTE'])
 * falha ao gravar 'N' com o usuário de integração. Este script tenta variações
 * para achar o payload que funciona, e RESTAURA os valores originais após cada
 * teste que passou (não deixa dados alterados).
 *
 * Uso:
 *   npx ts-node scripts/debug-finalizar-variacoes.ts [NUREL] [NOMUSU] [INTERNO]
 *
 * Exemplo (com sessão de usuário, opcional):
 *   npx ts-node scripts/debug-finalizar-variacoes.ts 710435 ANTONY senha
 */

const NUREL = process.argv[2] || '710435';
const NOMUSU = process.argv[3] || null;
const INTERNO = process.argv[4] || null;

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

async function post(token: string, serviceName: string, body: any, mgeSession?: string): Promise<any> {
  let url = `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=${serviceName}&outputType=json`;
  if (mgeSession) url += `&mgeSession=${encodeURIComponent(mgeSession)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return await resp.json();
}

function dsSave(entityName: string, fields: string[], values: (string | number)[], standAlone = false) {
  return {
    serviceName: 'DatasetSP.save',
    requestBody: {
      entityName,
      standAlone,
      fields,
      records: [{
        pk: { NUREL },
        values: fields.reduce((acc: any, f, i) => { acc[String(i)] = String(values[i]); return acc; }, {}),
      }],
    },
  };
}

function crudSave(fields: string[], values: (string | number)[]) {
  return {
    serviceName: 'CRUDServiceProvider.saveRecord',
    requestBody: {
      dataSet: {
        rootEntity: 'Relacionamento',
        includePresentationFields: 'N',
        offsetPage: '0',
        entity: [{
          path: '',
          fieldset: { list: fields.join(',') },
          records: [{ pk: { NUREL }, values: fields.reduce((acc: any, f, i) => { acc[f] = values[i]; return acc; }, {}) }],
        }],
      },
    },
  };
}

function fmt(res: any): string {
  return res.status === '1' ? '✅ ok' : `❌ ${(res.statusMessage || 'erro').slice(0, 60)}`;
}

async function buscarAtuais(token: string): Promise<{ pendente: string; situacao: string; dhprox: string }> {
  const q = await post(token, 'DbExplorerSP.executeQuery', {
    serviceName: 'DbExplorerSP.executeQuery',
    requestBody: { sql: `SELECT NUREL, PENDENTE, SITUACAO, TO_CHAR(DHPROXCHAM, 'DD/MM/YYYY HH24:MI:SS') AS DHPROXCHAM FROM TGFTEL WHERE NUREL = ${NUREL}` },
  });
  const meta: string[] = (q.responseBody?.fieldsMetadata || []).map((f: any) => f.name);
  const row: any[] = q.responseBody?.rows?.[0] || [];
  const m: Record<string, string> = {};
  meta.forEach((name, i) => { m[name] = String(row[i] ?? ''); });
  return { pendente: m.PENDENTE || 'N', situacao: m.SITUACAO || 'P', dhprox: m.DHPROXCHAM || '' };
}

async function main() {
  console.log(`=== Bateria: finalizar atendimento — NUREL=${NUREL} ===\n`);
  const token = await autenticar();
  console.log('Autenticado OK (usuário de integração)\n');

  let jsessionid: string | null = null;
  if (NOMUSU && INTERNO) {
    console.log(`Fazendo MobileLoginSP.login de ${NOMUSU}...`);
    const login = await post(token, 'MobileLoginSP.login', {
      serviceName: 'MobileLoginSP.login',
      requestBody: { NOMUSU: { $: NOMUSU }, INTERNO: { $: INTERNO } },
    });
    if (login.status === '1' && login.responseBody?.jsessionid) {
      jsessionid = login.responseBody.jsessionid.$;
      console.log(`   jsessionid: ${jsessionid}\n`);
    } else {
      console.log(`   ⚠️ login falhou: ${login.statusMessage || 'credenciais inválidas'} — pulando testes com sessão\n`);
    }
  }

  const atuais = await buscarAtuais(token);
  console.log(`Valores atuais: PENDENTE='${atuais.pendente}' SITUACAO='${atuais.situacao}'\n`);

  const testes: { nome: string; fn: () => Promise<any> }[] = [
    { nome: 'A. DatasetSP Relacionamento PENDENTE=N', fn: () => post(token, 'DatasetSP.save', dsSave('Relacionamento', ['PENDENTE'], ['N'])) },
    { nome: 'B. DatasetSP Relacionamento PENDENTE="" (vazio)', fn: () => post(token, 'DatasetSP.save', dsSave('Relacionamento', ['PENDENTE'], [''])) },
    { nome: 'C. DatasetSP Relacionamento PENDENTE=N + SITUACAO=C', fn: () => post(token, 'DatasetSP.save', dsSave('Relacionamento', ['PENDENTE', 'SITUACAO'], ['N', 'C'])) },
    { nome: 'D. DatasetSP Relacionamento SITUACAO=C (só)', fn: () => post(token, 'DatasetSP.save', dsSave('Relacionamento', ['SITUACAO'], ['C'])) },
    { nome: 'E. DatasetSP standAlone=true PENDENTE=N', fn: () => post(token, 'DatasetSP.save', dsSave('Relacionamento', ['PENDENTE'], ['N'], true)) },
    { nome: 'F. DatasetSP entity=Telefone PENDENTE=N', fn: () => post(token, 'DatasetSP.save', dsSave('Telefone', ['PENDENTE'], ['N'])) },
    { nome: 'G. CRUDProvider.saveRecord PENDENTE=N', fn: () => post(token, 'CRUDServiceProvider.saveRecord', crudSave(['PENDENTE'], ['N'])) },
  ];

  if (jsessionid) {
    testes.push(
      { nome: 'H. DatasetSP PENDENTE=N COM sessão usuário', fn: () => post(token, 'DatasetSP.save', dsSave('Relacionamento', ['PENDENTE'], ['N']), jsessionid!) },
      { nome: 'I. DatasetSP PENDENTE=N + SITUACAO=C COM sessão', fn: () => post(token, 'DatasetSP.save', dsSave('Relacionamento', ['PENDENTE', 'SITUACAO'], ['N', 'C']), jsessionid!) },
    );
  }

  const restaura = async () => {
    // Restaura PENDENTE e SITUACAO originais (ambos comprovadamente graváveis isolados)
    await post(token, 'DatasetSP.save', dsSave('Relacionamento', ['PENDENTE'], [atuais.pendente]));
    await post(token, 'DatasetSP.save', dsSave('Relacionamento', ['SITUACAO'], [atuais.situacao]));
  };

  for (const t of testes) {
    const res = await t.fn();
    const ok = res.status === '1';
    console.log(`  ${t.nome.padEnd(45)} → ${fmt(res)}`);
    if (ok) {
      await restaura();
      console.log(`  ${''.padEnd(45)}   ↳ (restaurado PENDENTE='${atuais.pendente}' SITUACAO='${atuais.situacao}')`);
    }
    console.log('');
  }

  // Confere o estado final
  const final = await buscarAtuais(token);
  console.log(`Estado final: PENDENTE='${final.pendente}' SITUACAO='${final.situacao}'`);
  console.log('\n=== FIM ===');
  console.log('Se A-G falharem e H/I passarem → só a sessão do usuário logado finaliza.');
  console.log('Se alguma variação (B/C/D/E/F/G) passar → dá para usar esse payload sem sessão.');
}

main().catch((e) => {
  console.error('\nErro fatal:', e.message);
  process.exit(1);
});
