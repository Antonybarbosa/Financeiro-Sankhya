import 'dotenv/config';

const GATEWAY_URL = process.env.GATEWAY_URL || '';
const CLIENT_ID = process.env.GATEWAY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GATEWAY_CLIENT_SECRET || '';
const X_TOKEN = process.env.GATEWAY_X_TOKEN || '';

async function executeQuery(token: string, sql: string): Promise<any> {
  const resp = await fetch(
    `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } }),
    },
  );
  const data = await resp.json() as any;
  if (data.status === '0') {
    throw new Error(data.statusMessage);
  }
  return data.responseBody;
}

async function main() {
  const numnota = 123625;

  console.log('Autenticando...');
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);

  const authResp = await fetch(`${GATEWAY_URL}/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Token': X_TOKEN },
    body: params.toString(),
  });
  const authData = await authResp.json() as any;
  const token = authData.access_token;
  console.log('Token obtido!\n');

  // 1. Verificar se existe e o tamanho do XML
  console.log(`=== Verificando NUMNOTA ${numnota} ===`);
  try {
    const result1 = await executeQuery(token, `
      SELECT NFE.NUNOTA, CAB.NUMNOTA, NFE.CHAVENFE,
             DBMS_LOB.GETLENGTH(NFE.XML) AS XML_SIZE
      FROM TGFNFE NFE
      INNER JOIN TGFCAB CAB ON CAB.NUNOTA = NFE.NUNOTA
      WHERE CAB.NUMNOTA = ${numnota}
        AND ROWNUM <= 1
    `);

    if (!result1.rows || result1.rows.length === 0) {
      console.log('Nenhum registro encontrado!');
      return;
    }

    const row = result1.rows[0];
    console.log('NUNOTA:', row[0]);
    console.log('NUMNOTA:', row[1]);
    console.log('CHAVENFE:', row[2]);
    console.log('XML_SIZE:', row[3], 'bytes');
  } catch (err: any) {
    console.log('Erro ao verificar tamanho:', err.message);
  }

  // 2. Tentar pegar primeiros 2000 chars do XML
  console.log('\n=== Tentando ler XML (chunk de 2000) ===');
  try {
    const result2 = await executeQuery(token, `
      SELECT DBMS_LOB.SUBSTR(NFE.XML, 2000, 1) AS XML_PART
      FROM TGFNFE NFE
      INNER JOIN TGFCAB CAB ON CAB.NUNOTA = NFE.NUNOTA
      WHERE CAB.NUMNOTA = ${numnota}
        AND ROWNUM <= 1
    `);

    if (result2.rows && result2.rows.length > 0) {
      const xml = result2.rows[0][0] || '';
      console.log(`Chunk lido: ${xml.length} chars`);
      console.log('Primeiros 500 chars:');
      console.log(xml.substring(0, 500));
    }
  } catch (err: any) {
    console.log('Erro ao ler chunk:', err.message);
  }

  // 3. Tentar via TO_CLOB com substr menor (400)
  console.log('\n=== Tentando com SUBSTR menor (400) ===');
  try {
    const result3 = await executeQuery(token, `
      SELECT DBMS_LOB.SUBSTR(NFE.XML, 400, 1) AS XML_PART
      FROM TGFNFE NFE
      INNER JOIN TGFCAB CAB ON CAB.NUNOTA = NFE.NUNOTA
      WHERE CAB.NUMNOTA = ${numnota}
        AND ROWNUM <= 1
    `);

    if (result3.rows && result3.rows.length > 0) {
      const xml = result3.rows[0][0] || '';
      console.log(`Chunk lido: ${xml.length} chars`);
      console.log(xml);
    }
  } catch (err: any) {
    console.log('Erro:', err.message);
  }
}

main().catch((e) => {
  console.error('Erro fatal:', e.message);
  process.exit(1);
});
