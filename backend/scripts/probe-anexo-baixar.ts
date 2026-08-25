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

async function svc(token: string, name: string, body: any) {
  const res = await fetch(`${process.env.GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=${name}&outputType=json`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const t = await res.text();
  let short: string;
  try {
    const j = JSON.parse(t);
    short = `status=${j.status} msg=${(j.statusMessage || '').slice(0, 140)}`;
    if (j.status === '1') short += ` BODY=${JSON.stringify(j.responseBody || {}).slice(0, 400)}`;
  } catch {
    short = t.slice(0, 140);
  }
  console.log(`[${name} ${JSON.stringify(Object.values((body.requestBody as any)?.params || body.requestBody || {})).slice(0, 80)}}] ${short}\n`);
}

async function bootstrap() {
  const token = await getToken();

  const variants: [string, any][] = [
    ['params.nuAttach=7', { params: { nuAttach: '7' } }],
    ['params.NUATTACH=7', { params: { NUATTACH: '7' } }],
    ['params.nuAttach int', { params: { nuAttach: 7 } }],
    ['params vazios', { params: {} }],
    ['reqBody direto nuAttach', { nuAttach: '7' }],
    ['reqBody direto keyAttach', { keyAttach: CHAVE }],
    ['params.keyAttach', { params: { keyAttach: CHAVE } }],
    ['params full salvar-like', { params: { nuAttach: '7', pkEntity: '6614', nameEntity: 'Parceiro', nameAttach: 'NFE TESTE ST.pdf', keyAttach: CHAVE, fileSelect: 1 } }],
  ];
  for (const [label, rb] of variants) {
    await svc(token, 'AnexoSistemaSP.baixar', { serviceName: 'AnexoSistemaSP.baixar', requestBody: rb });
    console.log(`   ^ ${label}`);
  }

  // outros métodos do AnexoSistemaSP
  for (const m of ['listar', 'abrir', 'visualizar', 'download', 'obter']) {
    await svc(token, `AnexoSistemaSP.${m}`, { serviceName: `AnexoSistemaSP.${m}`, requestBody: { params: { nuAttach: '7', pkEntity: '6614', nameEntity: 'Parceiro' } } });
  }
}

bootstrap();
