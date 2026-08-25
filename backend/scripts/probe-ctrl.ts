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

async function salvarRaw(token: string, sessionKey: string, nameAttach: string): Promise<string> {
  const res = await fetch(`${base}/gateway/v1/mge/service.sbr?serviceName=AnexoSistemaSP.salvar&outputType=json`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceName: 'AnexoSistemaSP.salvar',
      requestBody: { params: { pkEntity: String(CODPARC), keySession: sessionKey, nameEntity: 'Parceiro', description: 'Ctrl Exp', keyAttach: '', typeAcess: 'ALL', typeApres: 'LOC', nuAttach: '', nameAttach, resourceID: 'br.com.sankhya.core.cad.parceiros', fileSelect: 1, oldFile: '' } },
    }),
  });
  const j = await res.json();
  const ok = j.status === '1';
  const nu = ok ? parseInt(j.responseBody?.chave?.valor, 10) : 0;
  if (nu) {
    await fetch(`${base}/gateway/v1/mge/service.sbr?serviceName=DatasetSP.removeRecord&outputType=json`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceName: 'DatasetSP.removeRecord', requestBody: { dataSetID: '001', entityName: 'AnexoSistema', standAlone: false, pks: [{ NUATTACH: nu }], ignoreListenerMethods: '' } }),
    });
  }
  return ok ? `OK nuAttach=${nu}` : `FAIL: ${(j.statusMessage || '').slice(0, 50)}`;
}

async function bootstrap() {
  const gw = new SankhyaGateway(new ConfigService());

  // UM token para tudo
  const t1 = await getRawToken();
  // desta vez deixa o gateway autenticar POR CONTA PRÓPRIA
  const gwToken = await gw.getToken();
  console.log('token próprio == raw?', gwToken === t1);

  const sk1 = `ANEXO_SISTEMA_Parceiro_${CODPARC}`;
  const sk2 = `ANEXO_SISTEMA_Parceiro_${CODPARC}_B`;

  // 1) upload GATEWAY (mesmo token T1)
  await gw.uploadSessionFile(sk1, 'ctrl_gw.txt', Buffer.from('CTRL GATEWAY\n', 'utf-8'), 'text/plain');
  console.log('1) salvar após GATEWAY upload   :', await salvarRaw(t1, sk1, 'ctrl_gw.txt'));

  // 2) upload RAW (mesmo token T1)
  const fd = new FormData();
  fd.append('arquivo', new Blob([Buffer.from('CTRL RAW\n', 'utf-8')], { type: 'text/plain' }), 'ctrl_raw.txt');
  await fetch(`${base}/gateway/v1/mge/sessionUpload.mge?sessionkey=${encodeURIComponent(sk2)}&fitem=S&salvar=S&useCache=N`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + t1, Accept: 'text/html' },
    body: fd,
  });
  console.log('2) salvar após RAW upload       :', await salvarRaw(t1, sk2, 'ctrl_raw.txt'));
}

bootstrap().catch((e) => console.error('FALHA:', e));
