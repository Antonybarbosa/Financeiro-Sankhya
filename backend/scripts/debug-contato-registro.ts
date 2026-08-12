import 'dotenv/config';

/**
 * Visualiza todos os dados de um registro da TGFTEL.
 *
 * Uso:
 *   npx ts-node scripts/debug-contato-registro.ts [NUREL]
 *   (padrão: 710783)
 */

const NUREL = process.argv[2] || '710783';

const GATEWAY_URL = process.env.GATEWAY_URL || '';
const CLIENT_ID = process.env.GATEWAY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GATEWAY_CLIENT_SECRET || '';
const X_TOKEN = process.env.GATEWAY_X_TOKEN || '';

async function authenticate(): Promise<string> {
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);

  const response = await fetch(`${GATEWAY_URL}/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Token': X_TOKEN },
    body: params.toString(),
  });
  if (!response.ok) throw new Error(`Auth failed: ${response.status} ${response.statusText}`);
  const data = await response.json() as any;
  return data.access_token;
}

async function executeQuery(token: string, sql: string): Promise<any> {
  const response = await fetch(
    `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } }),
    },
  );
  const data = await response.json() as any;
  if (data.status === '0') throw new Error(`Query error: ${data.statusMessage}`);
  return data.responseBody;
}

async function main() {
  console.log('\nAutenticando no Sankhya...');
  const token = await authenticate();

  console.log(`\nConsultando TGFTEL NUREL=${NUREL}...\n`);

  // Todas as colunas da tabela, na ordem do dicionário
  const result = await executeQuery(token, `
    SELECT *
    FROM TGFTEL
    WHERE NUREL = ${NUREL}
  `);

  if (!result || !result.rows || result.rows.length === 0) {
    console.log(`Nenhum registro encontrado para NUREL=${NUREL}`);
    return;
  }

  const fields = (result.fieldsMetadata || []).map((f: any) => f.name);
  const row = result.rows[0];

  console.log('='.repeat(70));
  console.log(`  REGISTRO TGFTEL — NUREL ${NUREL}`);
  console.log('='.repeat(70));

  const sortedIndex = fields
    .map((name: string, i: number) => ({ name, i }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  for (const { name, i } of sortedIndex) {
    const value = row[i];
    console.log(`  ${name.padEnd(22)} = ${value === null || value === undefined ? '(null)' : JSON.stringify(value)}`);
  }

  console.log('');
  console.log('Legenda: PENDENTE=S/N (S=pendente) | SITUACAO (P=pending/A=andamento/C=concluido/X=cancelado)');
  console.log('CODATENDENTE/CODUSU = usuário responsável/dono do atendimento');
}

main().catch((err: any) => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
