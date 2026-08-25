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
const REPO = `Sistema/Anexos/Parceiro/${CHAVE}`;

async function svc(token: string, name: string, body: any, mod = 'mge') {
  const res = await fetch(`${process.env.GATEWAY_URL}/gateway/v1/${mod}/service.sbr?serviceName=${name}&outputType=json`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const t = await res.text();
  console.log(`[${name}] ${res.status}: ${t.slice(0, 600)}\n`);
}

async function bootstrap() {
  const token = await getToken();

  await svc(token, 'RepositorioArquivoSP.listarArquivos', {
    serviceName: 'RepositorioArquivoSP.listarArquivos',
    requestBody: { path: 'Sistema/Anexos/Parceiro' },
  });

  await svc(token, 'RepositorioArquivoSP.abrirArquivo', {
    serviceName: 'RepositorioArquivoSP.abrirArquivo',
    requestBody: { path: REPO },
  });

  await svc(token, 'RepositorioArquivoSP.baixarArquivo', {
    serviceName: 'RepositorioArquivoSP.baixarArquivo',
    requestBody: { path: REPO },
  });
}

bootstrap();
