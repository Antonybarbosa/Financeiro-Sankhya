import 'dotenv/config';

const GATEWAY_URL = process.env.GATEWAY_URL || '';
const CLIENT_ID = process.env.GATEWAY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GATEWAY_CLIENT_SECRET || '';
const X_TOKEN = process.env.GATEWAY_X_TOKEN || '';

async function main() {
  const numnota = 123630;

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

  async function execSql(sql: string) {
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
      console.log('ERRO SQL:', data.statusMessage);
      return null;
    }
    return data.responseBody;
  }

  // 1. Verificar se a nota existe no TGFCAB
  console.log(`\n=== 1. TGFCAB para NUMNOTA ${numnota} ===`);
  const cab = await execSql(`
    SELECT CAB.NUNOTA, CAB.NUMNOTA, CAB.TIPMOV, CAB.STATUSNFE, CAB.DTNEG
    FROM TGFCAB CAB
    WHERE CAB.NUMNOTA = ${numnota}
    ORDER BY CAB.NUNOTA DESC
  `);
  if (cab && cab.rows && cab.rows.length > 0) {
    for (const row of cab.rows) {
      console.log(`  NUNOTA=${row[0]}, NUMNOTA=${row[1]}, TIPMOV=${row[2]}, STATUSNFE=${row[3]}, DTNEG=${row[4]}`);
    }
  } else {
    console.log('  Nenhuma nota encontrada no TGFCAB!');
  }

  // 2. Verificar se existe XML no TGFNFE para esses NUNOTA
  console.log(`\n=== 2. TGFNFE para NUMNOTA ${numnota} ===`);
  const nfe = await execSql(`
    SELECT NFE.NUNOTA, CAB.NUMNOTA, NFE.CHAVENFE, DBMS_LOB.GETLENGTH(NFE.XML) AS XML_SIZE
    FROM TGFNFE NFE
    INNER JOIN TGFCAB CAB ON CAB.NUNOTA = NFE.NUNOTA
    WHERE CAB.NUMNOTA = ${numnota}
  `);
  if (nfe && nfe.rows && nfe.rows.length > 0) {
    for (const row of nfe.rows) {
      console.log(`  NUNOTA=${row[0]}, NUMNOTA=${row[1]}, CHAVE=${row[2]}, XML_SIZE=${row[3]}`);
    }
  } else {
    console.log('  Nenhum XML encontrado no TGFNFE!');
  }

  // 3. Verificar notas proximas (123625 a 123635) para entender o padrao
  console.log(`\n=== 3. Notas proximas (123625-123635) ===`);
  const proximas = await execSql(`
    SELECT CAB.NUMNOTA, CAB.NUNOTA, CAB.TIPMOV, CAB.STATUSNFE,
           (SELECT COUNT(*) FROM TGFNFE NFE WHERE NFE.NUNOTA = CAB.NUNOTA) AS TEM_XML
    FROM TGFCAB CAB
    WHERE CAB.NUMNOTA BETWEEN 123625 AND 123635
    ORDER BY CAB.NUMNOTA
  `);
  if (proximas && proximas.rows) {
    console.log('  NUMNOTA | NUNOTA  | TIPMOV | STATUSNFE | TEM_XML');
    console.log('  --------|---------|--------|-----------|--------');
    for (const row of proximas.rows) {
      console.log(`  ${String(row[0]).padEnd(7)} | ${String(row[1]).padEnd(7)} | ${String(row[2]).padEnd(6)} | ${String(row[3]).padEnd(9)} | ${row[4]}`);
    }
  }
}

main().catch((e) => {
  console.error('Erro fatal:', e.message);
  process.exit(1);
});
