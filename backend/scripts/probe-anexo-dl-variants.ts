import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const CHAVE_NOVA = '06d647d54f1007fde4fc87ace5e76f06';
const CHAVE_NATIVA = '75e31e9559a92cf7b41260615ad61b76';

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

async function tryDl(token: string, label: string, qs: string, headers: Record<string, string> = {}) {
  const res = await fetch(`${process.env.GATEWAY_URL}/gateway/v1/mge/visualizadorArquivos.mge?${qs}`, {
    headers: { Authorization: 'Bearer ' + token, ...headers },
  });
  const buf = Buffer.from(await res.arrayBuffer());
  const isHtml = buf.subarray(0, 6).toString('ascii').startsWith('<html>');
  console.log(`[${label}] ${res.status} len=${buf.length} htmlErr=${isHtml} cd=${res.headers.get('content-disposition')}`);
  if (!isHtml) console.log('   >>> CONTEÚDO:', buf.subarray(0, 80).toString('utf-8'));
  else console.log('   ', buf.toString('latin1').slice(0, 110));
}

async function cleanup(token: string) {
  // excluir com clientEventList (como no repo)
  const res = await fetch(`${process.env.GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=AnexoSistemaSP.excluir&outputType=json`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceName: 'AnexoSistemaSP.excluir',
      requestBody: {
        paramsDelete: { nuAttach: '8', pkEntity: '6614', nameEntity: 'Parceiro', nameAttach: 'teste_roundtrip_api.txt', keyAttach: '' },
        clientEventList: { clientEvent: [{ $: 'parceiro.mostra.mensagem.criticaie' }, { $: 'br.com.sankhya.mgecore.ie.repetida.transportadora' }] },
      },
    }),
  });
  const j = await res.json();
  console.log('CLEANUP excluir(clientEvent):', j.status, j.statusMessage);
}

async function bootstrap() {
  const token = await getToken();

  // variantes de param no visualizadorArquivos
  await tryDl(token, 'pathArquivo', `download=S&pathArquivo=${encodeURIComponent('Sistema/Anexos/Parceiro/' + CHAVE_NOVA)}`);
  await tryDl(token, 'arquivo-param', `download=S&arquivo=${encodeURIComponent('Sistema/Anexos/Parceiro/' + CHAVE_NOVA)}`);
  await tryDl(token, 'caminho-param', `download=S&caminho=${encodeURIComponent('Sistema/Anexos/Parceiro/' + CHAVE_NOVA)}`);
  await tryDl(token, 'chave+filename', `download=S&chaveArquivo=${CHAVE_NOVA}&nomeArquivo=teste_roundtrip_api.txt`);
  await tryDl(token, 'nativa chave-nua (de novo)', `download=S&chaveArquivo=${CHAVE_NATIVA}`);
  await tryDl(token, 'Accept octet-stream', `download=S&chaveArquivo=${CHAVE_NOVA}`, { Accept: 'application/octet-stream' });

  await cleanup(token);
}

bootstrap().catch((e) => console.error('FALHA:', e));
