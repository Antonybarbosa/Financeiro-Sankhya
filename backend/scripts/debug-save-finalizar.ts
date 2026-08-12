import 'dotenv/config';

/**
 * Diagnóstico — transição PENDENTE S→N (finalizar atendimento)
 *
 * O erro "Usuário logado não tem autorização para alterar este item!" ocorre
 * ao GRAVAR 'N' num registro com PENDENTE='S'. Este script testa S→N em vários
 * NURELs (só os que estão 'S') e RESTAURA para 'S' logo em seguida.
 *
 * Risco: se a restauração N→S falhar, o registro fica finalizado ('N').
 *
 * Uso:
 *   npx ts-node scripts/debug-save-finalizar.ts [qtd]
 */

const QTD = parseInt(process.argv[2] || '10', 10);

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

async function chamar(token: string, nurel: string, campos: string[], valores: string[]): Promise<any> {
  const url = `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json`;
  const payload = {
    serviceName: 'DatasetSP.save',
    requestBody: {
      entityName: 'Relacionamento',
      standAlone: false,
      fields: campos,
      records: [{
        pk: { NUREL: nurel },
        values: campos.reduce((acc: any, f, i) => { acc[String(i)] = valores[i]; return acc; }, {}),
      }],
    },
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await resp.json();
}

function fmt(res: any): string {
  return res.status === '1' ? '✅ ok' : `❌ ${(res.statusMessage || 'erro').slice(0, 60)}`;
}

async function main() {
  console.log(`=== Diagnóstico S→N (finalizar) — ${QTD} registros, restaura para 'S' ===\n`);
  const token = await autenticar();
  console.log('Autenticado OK\n');

  const sql = `SELECT * FROM (SELECT NUREL, PENDENTE, NVL(CODATENDENTE,0) AS CODATENDENTE, NVL(CODUSU,0) AS CODUSU FROM TGFTEL ORDER BY DHCHAMADA DESC) WHERE ROWNUM <= ${QTD * 2}`;
  const qResp = await fetch(
    `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } }),
    },
  );
  const qData = await qResp.json() as any;
  const fieldsMeta: string[] = (qData.responseBody?.fieldsMetadata || []).map((f: any) => f.name);
  const rows: any[][] = qData.responseBody?.rows || [];

  console.log('   NUREL      | DONO | PEND | S→N (finalizar)        | restaura N→S');
  console.log('   -----------|------|------|------------------------|-------------');
  let contados = 0;
  for (const r of rows) {
    if (contados >= QTD) break;
    const nurel = String(r[0]);
    const pend = String(r[1] ?? '');
    const dono = String(r[2] ?? '-');
    if (pend !== 'S') continue; // só testa registros pendentes
    contados++;

    const finalizar = await chamar(token, nurel, ['PENDENTE'], ['N']);
    const restaurar = await chamar(token, nurel, ['PENDENTE'], ['S']);
    console.log(
      `   ${nurel.padEnd(10)} | ${dono.padEnd(4)} | ${pend.padEnd(4)} | ${fmt(finalizar).padEnd(24)} | ${fmt(restaurar)}`,
    );
  }

  console.log('\n=== FIM ===');
  console.log('Se TODOS falharem em S→N → finalizar é ação restrita do usuário de integração.');
  console.log('Se só ALGUNS falharem → restrição por registro (dono = outro usuário).');
}

main().catch((e) => {
  console.error('\nErro fatal:', e.message);
  process.exit(1);
});
