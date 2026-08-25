import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const NOMUSU = 'ana.vit';
const INTERNO = '123456';
const CHAVE = '75e31e9559a92cf7b41260615ad61b76';

async function getBearer(): Promise<string> {
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

async function bootstrap() {
  const bearer = await getBearer();
  const base = process.env.GATEWAY_URL!;

  const loginRes = await fetch(`${base}/gateway/v1/mge/service.sbr?serviceName=MobileLoginSP.login&outputType=json`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + bearer, 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceName: 'MobileLoginSP.login', requestBody: { NOMUSU: { $: NOMUSU }, INTERNO: { $: INTERNO } } }),
  });
  const login = await loginRes.json();
  const js = login?.responseBody?.jsessionid?.$;
  if (!js) {
    console.log('login falhou');
    return;
  }

  const fieldsFull = {
    nuAttach: '7',
    pkEntity: '6614',
    nameEntity: 'Parceiro',
    nameAttach: 'NFE TESTE ST.pdf',
    keyAttach: CHAVE,
    fileSelect: '1',
  };

  const wrappers = ['params', 'paramsBaixar', 'baixar', 'paramsDownload', 'requestBody'];

  for (const w of wrappers) {
    const body: any = { serviceName: 'AnexoSistemaSP.baixar', requestBody: {} };
    body.requestBody[w] = { ...fieldsFull };
    const res = await fetch(`${base}/gateway/v1/mge/service.sbr?serviceName=AnexoSistemaSP.baixar&outputType=json&mgeSession=${js}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + bearer, 'Content-Type': 'application/json', Cookie: `JSESSIONID=${js}` },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    const ok = j.status === '1';
    console.log(`[wrapper=${w}] status=${j.status} msg=${(j.statusMessage || '').slice(0, 80)}`);
    if (ok) {
      console.log('   >>> SUCESSO! responseBody:', JSON.stringify(j.responseBody));
      // tentar download pelo transactionId
      const tx = j.transactionId;
      const dl = await fetch(`${base}/gateway/v1/mge/visualizadorArquivos.mge?download=S&chaveArquivo=${tx}&mgeSession=${js}`, {
        headers: { Authorization: 'Bearer ' + bearer },
      });
      const buf = Buffer.from(await dl.arrayBuffer());
      console.log(`   [dl tx] ${dl.status} len=${buf.length} pdf=${buf.subarray(0, 4).toString('ascii') === '%PDF'}`);
    }
  }
}

bootstrap().catch((e) => console.error('FALHA:', e));
