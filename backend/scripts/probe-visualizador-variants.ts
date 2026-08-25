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
  const chave = '75e31e9559a92cf7b41260615ad61b76';
  const variants = [
    'hidemail=S&download=S&chaveArquivo=' + chave,
    'chaveArquivo=' + chave,
    'download=S&useCache=N&chaveArquivo=' + chave,
  ];
  for (const qs of variants) {
    const res = await fetch(process.env.GATEWAY_URL + '/gateway/v1/mge/visualizadorArquivos.mge?' + qs, {
      headers: { Authorization: 'Bearer ' + token },
    });
    const t = await res.text();
    console.log('---', qs.slice(0, 60), '=>', res.status, res.headers.get('content-type'), 'len', t.length);
    console.log(t.slice(0, 300));
    console.log();
  }
}

bootstrap();
