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

async function svc(token: string, name: string, body: any) {
  const res = await fetch(`${process.env.GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=${name}&outputType=json`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const t = await res.text();
  let short = t.slice(0, 200);
  try {
    const j = JSON.parse(t);
    short = `status=${j.status} msg=${(j.statusMessage || '').slice(0, 160)}`;
    if (j.status === '1') short += ` BODY=${JSON.stringify(j.responseBody).slice(0, 300)}`;
  } catch { /* html */ }
  console.log(`[${name}] ${short}`);
}

async function bootstrap() {
  const token = await getToken();
  console.log('=== listarArquivos: variantes de params ===');
  const bodies: [string, any][] = [
    ['path-direto', { serviceName: 'RepositorioArquivoSP.listarArquivos', requestBody: { path: 'Sistema/Anexos/Parceiro' } }],
    ['PATH-maiusculo', { serviceName: 'RepositorioArquivoSP.listarArquivos', requestBody: { PATH: 'Sistema/Anexos/Parceiro' } }],
    ['path-dollar', { serviceName: 'RepositorioArquivoSP.listarArquivos', requestBody: { path: { $: 'Sistema/Anexos/Parceiro' } } }],
    ['caminho', { serviceName: 'RepositorioArquivoSP.listarArquivos', requestBody: { caminho: 'Sistema/Anexos/Parceiro' } }],
    ['vazio', { serviceName: 'RepositorioArquivoSP.listarArquivos', requestBody: {} }],
  ];
  for (const [label, b] of bodies) {
    await svc(token, 'RepositorioArquivoSP.listarArquivos', b);
    console.log(`   ^ ${label}\n`);
  }

  console.log('=== nomes alternativos ===');
  for (const m of ['download', 'downloadArquivo', 'abrir', 'baixar', 'carregar', 'carregarArquivo', 'lerArquivo', 'getArquivo', 'getBytes', 'arquivo']) {
    await svc(token, `RepositorioArquivoSP.${m}`, {
      serviceName: `RepositorioArquivoSP.${m}`,
      requestBody: { path: REPO },
    });
  }
}

bootstrap();
