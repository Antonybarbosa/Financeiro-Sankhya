import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

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

const CHAVE = '75e31e9559a92cf7b41260615ad61b76';

async function bootstrap() {
  const bearer = await getBearer();
  const base = process.env.GATEWAY_URL!;

  const calls: [string, string, any][] = [
    ['VisualizadorArquivosSP', 'visualizar', { chaveArquivo: CHAVE }],
    ['ArquivoSP', 'baixar', { chaveArquivo: CHAVE, path: `Sistema/Anexos/Parceiro/${CHAVE}` }],
    ['DownloadSP', 'baixar', { path: `Sistema/Anexos/Parceiro/${CHAVE}` }],
    ['RepositorioArquivoSP', 'exportar', { path: `Sistema/Anexos/Parceiro/${CHAVE}` }],
    ['RepositorioArquivoSP', 'download', { path: `Sistema/Anexos/Parceiro/${CHAVE}` }],
    ['AnexoSP', 'baixar', { nuAttach: '7' }],
  ];

  for (const [svc, method, params] of calls) {
    const name = `${svc}.${method}`;
    try {
      const res = await fetch(`${base}/gateway/v1/mge/service.sbr?serviceName=${name}&outputType=json`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + bearer, 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceName: name, requestBody: { params } }),
      });
      const j = await res.json();
      const msg = (j.statusMessage || '').slice(0, 100);
      const exists = !msg.includes('não encontrado');
      console.log(`${exists ? '>>> EXISTE <<<' : '    -    '} [${name}] status=${j.status} ${msg}`);
      if (exists && j.status === '1') console.log('     responseBody:', JSON.stringify(j.responseBody).slice(0, 300));
    } catch (e: any) {
      console.log(`[ERRO ${name}]`, e.message?.slice(0, 60));
    }
  }
}

bootstrap().catch((e) => console.error('FALHA:', e));
