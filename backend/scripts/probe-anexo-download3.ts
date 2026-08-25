import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function getToken(): Promise<string> {
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', process.env.GATEWAY_CLIENT_ID!);
  params.append('client_secret', process.env.GATEWAY_CLIENT_SECRET!);
  const r = await fetch(process.env.GATEWAY_URL + '/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Token': process.env.GATEWAY_X_TOKEN! },
    body: params.toString(),
  });
  return (await r.json()).access_token;
}

const CHAVE = '75e31e9559a92cf7b41260615ad61b76';

async function tryDownload(token: string, label: string, qs: string) {
  const res = await fetch(process.env.GATEWAY_URL + '/gateway/v1/mge/visualizadorArquivos.mge?' + qs, {
    headers: { Authorization: 'Bearer ' + token },
  });
  const buf = Buffer.from(await res.arrayBuffer());
  const isHtml = buf.subarray(0, 6).toString('ascii').startsWith('<html>');
  console.log(`[${label}] ${res.status} len=${buf.length} htmlErr=${isHtml} first16hex=${buf.subarray(0, 16).toString('hex')}`);
  if (isHtml) console.log('   ', buf.toString('latin1').slice(0, 130));
}

async function baixar(token: string, params: any): Promise<any> {
  const res = await fetch(
    `${process.env.GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=AnexoSistemaSP.baixar&outputType=json`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceName: 'AnexoSistemaSP.baixar', requestBody: { params } }),
    },
  );
  return res.json();
}

async function bootstrap() {
  const token = await getToken();

  // baixar com variantes de params
  const r1 = await baixar(token, { nuAttach: '7', pkEntity: '6614', nameEntity: 'Parceiro', nameAttach: 'NFE TESTE ST.pdf', keyAttach: '' });
  console.log('baixar v1:', JSON.stringify(r1).slice(0, 500));
  const r2 = await baixar(token, { nuAttach: '7', keyAttach: CHAVE });
  console.log('baixar v2:', JSON.stringify(r2).slice(0, 500));

  // tentar visualizador com transactionId (com e sem prefixo)
  for (const tx of [r1?.transactionId, r2?.transactionId]) {
    if (!tx) continue;
    await tryDownload(token, 'tx ' + tx.slice(0, 8), `download=S&chaveArquivo=${tx}`);
    await tryDownload(token, 'preVis ' + tx.slice(0, 8), `download=S&chaveArquivo=preVisualizacao_${tx}`);
  }
}

bootstrap();
