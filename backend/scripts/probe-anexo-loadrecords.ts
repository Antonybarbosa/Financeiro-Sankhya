import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const NOMUSU = 'ana.vit';
const INTERNO = '123456';

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
  console.log('jsessionid ok:', !!js);
  if (!js) return;

  const payload = {
    serviceName: 'CRUDServiceProvider.loadRecords',
    requestBody: {
      dataSet: {
        rootEntity: 'AnexoSistema',
        includePresentationFields: 'S',
        offsetPage: '0',
        entity: { path: '', fieldset: { list: 'NUATTACH,NOMEARQUIVO,CHAVEARQUIVO,PKREGISTRO,NOMEINSTANCIA' } },
      },
      criteria: { expression: { $: 'this.NUATTACH = 7' } },
    },
  };
  const res = await fetch(`${base}/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json&mgeSession=${js}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + bearer, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const t = await res.text();
  console.log(t.slice(0, 1200));
}

bootstrap().catch((e) => console.error('FALHA:', e));
