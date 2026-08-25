import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const CODPARC = 6614;
const base = process.env.GATEWAY_URL!;
const sessionKey = `ANEXO_SISTEMA_Parceiro_${CODPARC}`;

async function salvar(gw: SankhyaGateway, token: string, nameAttach: string): Promise<boolean> {
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
          description: 'Isolamento A/B',
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
  const ok = j.status === '1';
  const nu = ok ? parseInt(j.responseBody?.chave?.valor, 10) : 0;
  console.log(`   salvar(${nameAttach}): status=${j.status} ${ok ? 'nuAttach=' + nu : (j.statusMessage || '').slice(0, 60)}`);
  if (nu) {
    await gw.serviceCall('DatasetSP.removeRecord', {
      serviceName: 'DatasetSP.removeRecord',
      requestBody: { dataSetID: '001', entityName: 'AnexoSistema', standAlone: false, pks: [{ NUATTACH: nu }], ignoreListenerMethods: '' },
    });
  }
  return ok;
}

async function bootstrap() {
  const gw = new SankhyaGateway(new ConfigService());
  const token = await (async () => {
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
  })();

  // A) upload RAW (estilo probe que funciona)
  console.log('A) upload RAW fetch');
  const contentA = 'conteudo RAW metodo A\n';
  const fdA = new FormData();
  fdA.append('arquivo', new Blob([Buffer.from(contentA, 'utf-8')], { type: 'application/octet-stream' }), 'iso_raw.txt');
  const resA = await fetch(`${base}/gateway/v1/mge/sessionUpload.mge?sessionkey=${encodeURIComponent(sessionKey)}&fitem=S&salvar=S&useCache=N`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, Accept: 'text/html' },
    body: fdA,
  });
  console.log('   upload HTTP', resA.status);
  await salvar(gw, token, 'iso_raw.txt');

  // B) upload via método do gateway (token do gateway)
  console.log('B) upload gateway.uploadSessionFile');
  const gwToken = await gw.getToken();
  console.log('   mesmo token?', gwToken === token);
  await gw.uploadSessionFile(sessionKey, 'iso_gw.txt', Buffer.from('conteudo GATEWAY metodo B\n', 'utf-8'), 'application/octet-stream');
  console.log('   upload OK');
  await salvar(gw, token, 'iso_gw.txt');
}

bootstrap().catch((e) => console.error('FALHA:', e));
