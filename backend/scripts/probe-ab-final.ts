import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const CODPARC = 6614;
const base = process.env.GATEWAY_URL!;

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

async function bootstrap() {
  // A) gateway com token PRÓPRIO
  const gwA = new SankhyaGateway(new ConfigService());
  await gwA.getToken();
  await gwA.uploadSessionFile(`ANEXO_SISTEMA_Parceiro_${CODPARC}_A`, 'ab_gwproprio.txt', Buffer.from('A GW PROPRIO\n', 'utf-8'), 'text/plain');
  const cookieA = gwA.getAuthCookie() || undefined;
  try {
    const r = await gwA.serviceCall('AnexoSistemaSP.salvar', {
      serviceName: 'AnexoSistemaSP.salvar',
      requestBody: { params: { pkEntity: String(CODPARC), keySession: `ANEXO_SISTEMA_Parceiro_${CODPARC}_A`, nameEntity: 'Parceiro', description: 'AB Proprio', keyAttach: '', typeAcess: 'ALL', typeApres: 'LOC', nuAttach: '', nameAttach: 'ab_gwproprio.txt', resourceID: 'br.com.sankhya.core.cad.parceiros', fileSelect: 1, oldFile: '' } },
    }, 'mge', cookieA ? { Cookie: cookieA } : undefined);
    console.log('A) gateway token PRÓPRIO + cookie:', 'OK nuAttach=' + r?.responseBody?.chave?.valor);
  } catch (e: any) {
    console.log('A) gateway token PRÓPRIO + cookie: FAIL —', e.message.slice(0, 60));
  }

  // B) mesmo gateway method, token RAW injetado (SEM cookie, igual run que funcionou)
  const gwB = new SankhyaGateway(new ConfigService());
  const tRaw = await getRawToken();
  (gwB as any).token = tRaw;
  (gwB as any).tokenExpiry = Date.now() + 600000;
  await gwB.uploadSessionFile(`ANEXO_SISTEMA_Parceiro_${CODPARC}_B`, 'ab_gwraw.txt', Buffer.from('B GW RAWTOKEN\n', 'utf-8'), 'text/plain');
  try {
    const r = await gwB.serviceCall('AnexoSistemaSP.salvar', {
      serviceName: 'AnexoSistemaSP.salvar',
      requestBody: { params: { pkEntity: String(CODPARC), keySession: `ANEXO_SISTEMA_Parceiro_${CODPARC}_B`, nameEntity: 'Parceiro', description: 'AB RawTok', keyAttach: '', typeAcess: 'ALL', typeApres: 'LOC', nuAttach: '', nameAttach: 'ab_gwraw.txt', resourceID: 'br.com.sankhya.core.cad.parceiros', fileSelect: 1, oldFile: '' } },
    });
    console.log('B) gateway token RAW injetado      :', 'OK nuAttach=' + r?.responseBody?.chave?.valor);
  } catch (e: any) {
    console.log('B) gateway token RAW injetado      : FAIL —', e.message.slice(0, 60));
  }
}

bootstrap().catch((e) => console.error('FALHA:', e));
