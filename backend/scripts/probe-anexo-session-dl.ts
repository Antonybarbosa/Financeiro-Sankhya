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

  // 1. login com sessão de usuário
  const loginRes = await fetch(`${base}/gateway/v1/mge/service.sbr?serviceName=MobileLoginSP.login&outputType=json`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + bearer, 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceName: 'MobileLoginSP.login', requestBody: { NOMUSU: { $: NOMUSU }, INTERNO: { $: INTERNO } } }),
  });
  const login = await loginRes.json();
  const jsessionid = login?.responseBody?.jsessionid?.$;
  console.log('login status:', login.status, 'jsessionid:', jsessionid ? jsessionid.slice(0, 12) + '...' : 'NULO');
  if (!jsessionid) return;

  // 2. download com mgeSession (cookie + param)
  const dlUrl = `${base}/gateway/v1/mge/visualizadorArquivos.mge?mgeSession=${jsessionid}&download=S&chaveArquivo=${CHAVE}`;
  const variants: [string, Record<string, string>][] = [
    ['cookie JSESSIONID', { Cookie: `JSESSIONID=${jsessionid}`, Authorization: 'Bearer ' + bearer }],
    ['cookie + no bearer', { Cookie: `JSESSIONID=${jsessionid}` }],
    ['só bearer', { Authorization: 'Bearer ' + bearer }],
  ];
  for (const [label, headers] of variants) {
    const res = await fetch(dlUrl, { headers });
    const buf = Buffer.from(await res.arrayBuffer());
    const isHtml = buf.subarray(0, 6).toString('ascii').startsWith('<html>');
    const isPdf = buf.subarray(0, 4).toString('ascii') === '%PDF';
    console.log(`[${label}] ${res.status} len=${buf.length} pdf=${isPdf} htmlErr=${isHtml} cd=${res.headers.get('content-disposition')}`);
    if (!isPdf && !isHtml) console.log('   first16hex:', buf.subarray(0, 16).toString('hex'));
    if (isHtml) console.log('   ', buf.toString('latin1').slice(0, 110));
  }
}

bootstrap().catch((e) => console.error('FALHA:', e));
