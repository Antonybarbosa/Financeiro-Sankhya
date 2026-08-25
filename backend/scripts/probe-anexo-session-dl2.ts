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
  const jsessionid = login?.responseBody?.jsessionid?.$;
  if (!jsessionid) {
    console.log('login falhou:', login.statusMessage);
    return;
  }

  // chaves candidatas
  const keys = [
    CHAVE,
    `anexo_${CHAVE}`,
    `ANEXO_${CHAVE}`,
    `Sistema/Anexos/Parceiro/${CHAVE}`,
    `Sistema/Anexos/${CHAVE}`,
    `${CHAVE}.pdf`,
  ];

  for (const k of keys) {
    const url = `${base}/gateway/v1/mge/visualizadorArquivos.mge?download=S&chaveArquivo=${encodeURIComponent(k)}&mgeSession=${jsessionid}`;
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + bearer, Cookie: `JSESSIONID=${jsessionid}` } });
    const buf = Buffer.from(await res.arrayBuffer());
    const isPdf = buf.subarray(0, 4).toString('ascii') === '%PDF';
    const isHtml = buf.subarray(0, 6).toString('ascii').startsWith('<html');
    console.log(`[${k.slice(0, 40)}] ${res.status} len=${buf.length} pdf=${isPdf} htmlErr=${isHtml}`);
    if (isPdf) {
      console.log('   >>> PDF BAIXADO COM SUCESSO <<<');
    }
  }

  // Extra: com sessão, tentar AnexoSistemaSP.baixar de novo
  const baixar = await fetch(`${base}/gateway/v1/mge/service.sbr?serviceName=AnexoSistemaSP.baixar&outputType=json&mgeSession=${jsessionid}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + bearer, 'Content-Type': 'application/json', Cookie: `JSESSIONID=${jsessionid}` },
    body: JSON.stringify({ serviceName: 'AnexoSistemaSP.baixar', requestBody: { params: { nuAttach: '7', pkEntity: '6614', nameEntity: 'Parceiro', nameAttach: 'NFE TESTE ST.pdf', keyAttach: '' } } }),
  });
  const bj = await baixar.json();
  console.log('\nAnexoSistemaSP.baixar (com sessão):', bj.status, JSON.stringify(bj.responseBody || bj.statusMessage).slice(0, 400));

  // se retornar chave/documento, tentar baixá-la
  const docKey = bj?.responseBody?.documento?.$ || bj?.responseBody?.chave?.valor || bj?.responseBody?.chaveArquivo?.$;
  if (docKey) {
    console.log('docKey retornada:', docKey);
    const url = `${base}/gateway/v1/mge/visualizadorArquivos.mge?download=S&chaveArquivo=${encodeURIComponent(docKey)}&mgeSession=${jsessionid}`;
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + bearer } });
    const buf = Buffer.from(await res.arrayBuffer());
    console.log('download docKey:', res.status, 'len', buf.length, 'pdf=', buf.subarray(0, 4).toString('ascii') === '%PDF');
  }
}

bootstrap().catch((e) => console.error('FALHA:', e));
