import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const CODPARC = 6614;
const base = process.env.GATEWAY_URL!;
const sessionKey = `ANEXO_SISTEMA_Parceiro_${CODPARC}`;

async function getRawToken(): Promise<string> {
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', process.env.GATEWAY_CLIENT_ID!);
  params.append('client_secret', process.env.GATEWAY_CLIENT_SECRET!);
  const r = await fetch(base + '/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Token': process.env.GATEWAY_X_TOKEN! },
    body: params.toString(),
  });
  return (await r.json()).access_token;
}

async function salvarRaw(token: string, nameAttach: string, label: string): Promise<void> {
  const res = await fetch(`${base}/gateway/v1/mge/service.sbr?serviceName=AnexoSistemaSP.salvar&outputType=json`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceName: 'AnexoSistemaSP.salvar',
      requestBody: {
        params: {
          pkEntity: String(CODPARC),
          keySession: sessionKey,
          nameEntity: 'Parceiro',
          description: 'Isolamento Token',
          keyAttach: '',
          typeAcess: 'ALL',
          typeApres: 'LOC',
          nuAttach: '',
          nameAttach,
          resourceID: 'br.com.sankhya.core.cad.parceiros',
          fileSelect: 1,
          oldFile: '',
        },
      },
    }),
  });
  const j = await res.json();
  console.log(`   salvar[${label}] status=${j.status} ${j.status === '1' ? 'OK nuAttach=' + j.responseBody?.chave?.valor : (j.statusMessage || '').slice(0, 60)}`);
}

async function bootstrap() {
  const gw = new SankhyaGateway(new ConfigService());
  const t0 = await getRawToken();

  // 1 upload GATEWAY (T1 interno), sem salvar ainda
  await gw.uploadSessionFile(sessionKey, 'iso_tok.pdf', Buffer.from('%PDF-1.4 isolamento\n%%EOF\n', 'utf-8'), 'application/pdf');
  console.log('upload gateway OK');

  // descobrir token T1 que o gateway usou (mesmo fluxo: authenticate igual)
  const t1 = await gw.getToken();

  // 2 salvar com T0 (raw) e T1 (gateway) para o MESMO arquivo
  console.log('salvar iso_tok.pdf com token RAW T0:');
  await salvarRaw(t0, 'iso_tok.pdf', 'T0-raw');
  console.log('salvar iso_tok.pdf com token gateway T1:');
  await salvarRaw(t1, 'iso_tok.pdf', 'T1-gw');
}

bootstrap().catch((e) => console.error('FALHA:', e));
