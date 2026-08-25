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

async function probe(token: string, label: string, url: string, body?: string) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
      body,
    });
    const buf = Buffer.from(await res.arrayBuffer());
    const preview = buf.subarray(0, 80).toString('latin1').replace(/\s+/g, ' ');
    console.log(`[${label}] ${res.status} ct=${res.headers.get('content-type')} len=${buf.length} first16hex=${buf.subarray(0, 16).toString('hex')} :: ${preview}`);
  } catch (e: any) {
    console.log(`[${label}] ERRO ${e.message}`);
  }
}

async function bootstrap() {
  const token = await getToken();
  const base = process.env.GATEWAY_URL!;

  await probe(token, 'downloadAnexo POST qs', `${base}/gateway/v1/mge/downloadAnexo.mge?nuAttach=7&chaveArquivo=${CHAVE}`);
  await probe(token, 'downloadAnexo POST form', `${base}/gateway/v1/mge/downloadAnexo.mge`, `nuAttach=7&chaveArquivo=${CHAVE}`);
  await probe(token, 'anexoDownload POST qs', `${base}/gateway/v1/mge/anexoDownload.mge?nuAttach=7`);
  await probe(token, 'sessionDownload POST qs', `${base}/gateway/v1/mge/sessionDownload.mge?chaveArquivo=${CHAVE}`);
  await probe(token, 'anexoSistema POST qs', `${base}/gateway/v1/mge/anexoSistema.mge?nuAttach=7`);
  await probe(token, 'sessionUpload GET-name check', `${base}/gateway/v1/mge/sessionUpload.mge`);
}

bootstrap();
