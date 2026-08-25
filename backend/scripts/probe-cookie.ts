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

async function bootstrap() {
  const token = await getRawToken();

  // 1. authenticate via serviceCall também pode setar cookie — checar
  const svc = await fetch(`${base}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: 'SELECT 1 AS X FROM DUAL' } }),
  });
  console.log('serviceCall set-cookie:', svc.headers.getSetCookie?.() || svc.headers.get('set-cookie'));

  // 2. upload RAW capturando set-cookie
  const fd = new FormData();
  fd.append('arquivo', new Blob([Buffer.from('COOKIE-TEST\n', 'utf-8')], { type: 'text/plain' }), 'cookie_test.txt');
  const up = await fetch(`${base}/gateway/v1/mge/sessionUpload.mge?sessionkey=${encodeURIComponent(sessionKey)}&fitem=S&salvar=S&useCache=N`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, Accept: 'text/html' },
    body: fd,
  });
  const upCookies = up.headers.getSetCookie?.() || [];
  console.log('upload status:', up.status, 'set-cookie:', upCookies);

  // 3. salvar SEM cookie
  const s1 = await fetch(`${base}/gateway/v1/mge/service.sbr?serviceName=AnexoSistemaSP.salvar&outputType=json`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceName: 'AnexoSistemaSP.salvar',
      requestBody: { params: { pkEntity: String(CODPARC), keySession: sessionKey, nameEntity: 'Parceiro', description: 'Cookie Test', keyAttach: '', typeAcess: 'ALL', typeApres: 'LOC', nuAttach: '', nameAttach: 'cookie_test.txt', resourceID: 'br.com.sankhya.core.cad.parceiros', fileSelect: 1, oldFile: '' } },
    }),
  });
  const j1 = await s1.json();
  console.log('salvar sem cookie:', j1.status, j1.statusMessage || JSON.stringify(j1.responseBody?.chave || {}));

  // 4. upload de novo + salvar COM cookie (se houver)
  if (upCookies.length > 0) {
    await fetch(`${base}/gateway/v1/mge/sessionUpload.mge?sessionkey=${encodeURIComponent(sessionKey)}&fitem=S&salvar=S&useCache=N`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, Accept: 'text/html', Cookie: upCookies.map((c: string) => c.split(';')[0]).join('; ') },
      body: fd,
    });
    const s2 = await fetch(`${base}/gateway/v1/mge/service.sbr?serviceName=AnexoSistemaSP.salvar&outputType=json`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Cookie: upCookies.map((c: string) => c.split(';')[0]).join('; ') },
      body: JSON.stringify({
        serviceName: 'AnexoSistemaSP.salvar',
        requestBody: { params: { pkEntity: String(CODPARC), keySession: sessionKey, nameEntity: 'Parceiro', description: 'Cookie Test', keyAttach: '', typeAcess: 'ALL', typeApres: 'LOC', nuAttach: '', nameAttach: 'cookie_test.txt', resourceID: 'br.com.sankhya.core.cad.parceiros', fileSelect: 1, oldFile: '' } },
      }),
    });
    const j2 = await s2.json();
    console.log('salvar COM cookie:', j2.status, j2.statusMessage || JSON.stringify(j2.responseBody?.chave || {}));
    const nu = parseInt(j2.responseBody?.chave?.valor, 10);
    if (nu) {
      await fetch(`${base}/gateway/v1/mge/service.sbr?serviceName=DatasetSP.removeRecord&outputType=json`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceName: 'DatasetSP.removeRecord', requestBody: { dataSetID: '001', entityName: 'AnexoSistema', standAlone: false, pks: [{ NUATTACH: nu }], ignoreListenerMethods: '' } }),
      });
    }
  }
}

bootstrap().catch((e) => console.error('FALHA:', e));
