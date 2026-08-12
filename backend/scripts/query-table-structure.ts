import 'dotenv/config';

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://api.sandbox.sankhya.com.br';
const GATEWAY_CLIENT_ID = process.env.GATEWAY_CLIENT_ID || '';
const GATEWAY_CLIENT_SECRET = process.env.GATEWAY_CLIENT_SECRET || '';
const GATEWAY_X_TOKEN = process.env.GATEWAY_X_TOKEN || '';

async function authenticate(): Promise<string> {
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', GATEWAY_CLIENT_ID);
  params.append('client_secret', GATEWAY_CLIENT_SECRET);

  const response = await fetch(`${GATEWAY_URL}/authenticate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Token': GATEWAY_X_TOKEN,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as any;
  return data.access_token;
}

async function executeQuery(token: string, sql: string): Promise<any> {
  const body = {
    serviceName: 'DbExplorerSP.executeQuery',
    requestBody: { sql },
  };

  const response = await fetch(
    `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  const data = await response.json() as any;

  if (data.status === '0') {
    throw new Error(`Query error: ${data.statusMessage}`);
  }

  return data.responseBody;
}

function printTable(result: any, tableName: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`  TABELA: ${tableName}`);
  console.log(`${'='.repeat(80)}\n`);

  if (!result || !result.rows || result.rows.length === 0) {
    console.log('  (nenhuma coluna encontrada)\n');
    return;
  }

  const fields = result.fieldsMetadata.map((f: any) => f.name);

  console.log(`  Total de colunas: ${result.rows.length}\n`);

  console.log(
    '  ' +
      fields.map((f: string) => f.padEnd(16)).join(' | '),
  );
  console.log('  ' + '-'.repeat(fields.length * 18));

  for (const row of result.rows) {
    const cells = row.map((cell: any) => {
      const str = cell === null || cell === undefined ? '-' : String(cell);
      return str.padEnd(16);
    });
    console.log('  ' + cells.join(' | '));
  }
  console.log('');
}

async function main() {
  console.log('\nAutenticando no Sankhya...');
  const token = await authenticate();
  console.log('Token obtido com sucesso!');

  const tables = ['TGFNFE'];

  for (const table of tables) {
    const sql = `SELECT
    utc.COLUMN_ID,
    utc.COLUMN_NAME,
    utc.DATA_TYPE,
    utc.DATA_LENGTH,
    utc.DATA_PRECISION,
    utc.DATA_SCALE,
    utc.NULLABLE,
    ucc.COMMENTS
FROM USER_TAB_COLUMNS utc
LEFT JOIN USER_COL_COMMENTS ucc
       ON utc.TABLE_NAME = ucc.TABLE_NAME
      AND utc.COLUMN_NAME = ucc.COLUMN_NAME
WHERE utc.TABLE_NAME = '${table}'
ORDER BY utc.COLUMN_ID`;

    console.log(`\nConsultando estrutura de ${table}...`);
    try {
      const result = await executeQuery(token, sql);
      printTable(result, table);
    } catch (err: any) {
      console.error(`Erro ao consultar ${table}: ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
