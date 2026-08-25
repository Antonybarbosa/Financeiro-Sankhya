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
  console.log(`[${label}] ${res.status} len=${buf.length} htmlErr=${isHtml} first16=${buf.subarray(0, 16).toString('hex')}`);
  if (isHtml) console.log('   ', buf.toString('latin1').slice(0, 120));
}

async function tryService(token: string, serviceName: string, body: any) {
  const res = await fetch(
    `${process.env.GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=${serviceName}&outputType=json`,
    { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  );
  const t = await res.text();
  console.log(`[svc ${serviceName}] ${res.status}: ${t.slice(0, 400)}`);
}

async function bootstrap() {
  const token = await getToken();

  await tryDownload(token, 'rel-path Sistema/Anexos/Parceiro', `download=S&chaveArquivo=${encodeURIComponent('Sistema/Anexos/Parceiro/' + CHAVE)}`);
  await tryDownload(token, 'rel-path Anexos/Parceiro', `download=S&chaveArquivo=${encodeURIComponent('Anexos/Parceiro/' + CHAVE)}`);
  await tryDownload(token, 'rel-path Sistema/Anexos', `download=S&chaveArquivo=${encodeURIComponent('Sistema/Anexos/' + CHAVE)}`);
  await tryDownload(token, 'with mgeSession param', `mgeSession=${token}&chaveArquivo=${CHAVE}`);

  await tryService(token, 'AnexoSistemaSP.baixar', {
    serviceName: 'AnexoSistemaSP.baixar',
    requestBody: { params: { nuAttach: '7', pkEntity: '6614', nameEntity: 'Parceiro', nameAttach: 'NFE TESTE ST.pdf', keyAttach: '' } },
  });
}

bootstrap();
