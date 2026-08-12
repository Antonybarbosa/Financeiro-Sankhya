import 'dotenv/config';
import { parseStringPromise } from 'xml2js';

const GATEWAY_URL = process.env.GATEWAY_URL || '';
const CLIENT_ID = process.env.GATEWAY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GATEWAY_CLIENT_SECRET || '';
const X_TOKEN = process.env.GATEWAY_X_TOKEN || '';
const CHUNK_SIZE = 3900;

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

  // 1. Metadata
  console.log(`=== NUMNOTA ${numnota} ===`);
  const metaResp = await fetch(
    `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceName: 'DbExplorerSP.executeQuery',
        requestBody: {
          sql: `SELECT NFE.NUNOTA, CAB.NUMNOTA, NFE.CHAVENFE, DBMS_LOB.GETLENGTH(NFE.XML) AS XML_SIZE FROM TGFNFE NFE INNER JOIN TGFCAB CAB ON CAB.NUNOTA = NFE.NUNOTA WHERE CAB.NUMNOTA = ${numnota} AND ROWNUM <= 1`,
        },
      }),
    },
  );
  const metaData = await metaResp.json() as any;
  const metaRow = metaData.responseBody.rows[0];
  const nunota = parseInt(metaRow[0]);
  const xmlSize = parseInt(metaRow[3]);
  console.log('NUNOTA:', nunota);
  console.log('CHAVENFE:', metaRow[2]);
  console.log('XML_SIZE:', xmlSize, 'bytes');

  // 2. Read chunks
  const numChunks = Math.ceil(xmlSize / CHUNK_SIZE);
  console.log(`\nLendo ${numChunks} chunks de ${CHUNK_SIZE} bytes...`);
  const parts: string[] = [];

  for (let i = 0; i < numChunks; i++) {
    const offset = i * CHUNK_SIZE + 1;
    const chunkResp = await fetch(
      `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName: 'DbExplorerSP.executeQuery',
          requestBody: {
            sql: `SELECT DBMS_LOB.SUBSTR(XML, ${CHUNK_SIZE}, ${offset}) AS CHUNK FROM TGFNFE WHERE NUNOTA = ${nunota} AND ROWNUM <= 1`,
          },
        }),
      },
    );
    const chunkData = await chunkResp.json() as any;
    const chunk = chunkData.responseBody.rows[0]?.[0] || '';
    parts.push(chunk);
    process.stdout.write(`  Chunk ${i + 1}/${numChunks}: ${chunk.length} chars\n`);
  }

  const xml = parts.join('');
  console.log(`\nXML total: ${xml.length} chars`);

  // 3. Parse XML
  console.log('\n=== PARSEANDO XML ===');
  const result = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
  const nfeProc = result.nfeProc || result;
  const NFe = nfeProc.NFe || nfeProc;
  const infNFe = NFe.infNFe || {};
  const ide = infNFe.ide || {};
  const emit = infNFe.emit || {};
  const dest = infNFe.dest || {};
  const total = infNFe.total?.ICMSTot || {};

  console.log('Numero NFE:', ide.nNF);
  console.log('Serie:', ide.serie);
  console.log('Emissao:', ide.dhEmi);
  console.log('Natureza:', ide.natOp);
  console.log('Emitente:', emit.xNome, '- CNPJ:', emit.CNPJ);
  console.log('Destinatario:', dest.xNome, '- CNPJ/CPF:', dest.CNPJ || dest.CPF);
  console.log('Valor Total:', total.vNF);

  const detList = infNFe.det;
  const detArray = Array.isArray(detList) ? detList : detList ? [detList] : [];
  console.log(`\nItens: ${detArray.length}`);
  detArray.forEach((det: any, i: number) => {
    const prod = det.prod;
    console.log(`  ${i + 1}. ${prod.xProd} - Qtd: ${prod.qCom} ${prod.uCom} - Vl: ${prod.vProd}`);
  });
}

main().catch((e) => {
  console.error('Erro fatal:', e.message);
  process.exit(1);
});
