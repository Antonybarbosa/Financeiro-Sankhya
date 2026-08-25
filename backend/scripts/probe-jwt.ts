import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const base = process.env.GATEWAY_URL!;

async function auth(): Promise<string> {
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', process.env.GATEWAY_CLIENT_ID!);
  params.append('client_secret', process.env.GATEWAY_CLIENT_SECRET!);
  const r = await fetch(base + '/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Token': process.env.GATEWAY_X_TOKEN! },
    body: params.toString(),
  });
  const j = await r.json();
  return j.access_token;
}

function decode(jwt: string): any {
  const parts = jwt.split('.');
  const payload = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
  return JSON.parse(payload);
}

async function bootstrap() {
  const tokens = await Promise.all([auth(), auth(), auth(), auth()]);
  tokens.forEach((t, i) => {
    const p = decode(t);
    console.log(`token ${i}:`, JSON.stringify(p));
  });
}

bootstrap().catch((e) => console.error('FALHA:', e));
