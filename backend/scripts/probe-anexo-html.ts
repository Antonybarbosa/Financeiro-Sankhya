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

async function bootstrap() {
  const token = await getToken();
  const sessionKey = 'ANEXO_SISTEMA_Parceiro_6614_PROBE';

  const content = Buffer.from('conteudo probe\n', 'utf-8');
  const fd = new FormData();
  fd.append('arquivo', new Blob([content], { type: 'text/plain' }), 'probe_le_html.txt');

  const upRes = await fetch(
    `${process.env.GATEWAY_URL}/gateway/v1/mge/sessionUpload.mge?sessionkey=${encodeURIComponent(sessionKey)}&fitem=S&salvar=S&useCache=N`,
    { method: 'POST', headers: { Authorization: 'Bearer ' + token, Accept: 'text/html' }, body: fd },
  );
  const html = await upRes.text();
  console.log('STATUS:', upRes.status, 'len:', html.length);
  console.log('===== HTML COMPLETO =====');
  console.log(html);
}

bootstrap().catch((e) => console.error(e));
