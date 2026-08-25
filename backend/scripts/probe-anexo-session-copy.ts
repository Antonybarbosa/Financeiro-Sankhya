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

async function bootstrap() {
  const bearer = await getBearer();
  const base = process.env.GATEWAY_URL!;
  const sessionKey = 'ANEXO_SISTEMA_Parceiro_6614_SESSIONTEST';

  // 1. upload de bytes conhecidos
  const content = 'CONTEUDO TESTE DOWNLOAD SESSAO 12345\n';
  const fd = new FormData();
  fd.append('arquivo', new Blob([content], { type: 'text/plain' }), 'teste_sessao_dl.txt');
  const up = await fetch(`${base}/gateway/v1/mge/sessionUpload.mge?sessionkey=${encodeURIComponent(sessionKey)}&fitem=S&salvar=S&useCache=N`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + bearer, Accept: 'text/html' },
    body: fd,
  });
  console.log('upload status:', up.status);

  // 2. tentar baixar a copia em sessao com variantes de chave
  const variants = [
    sessionKey,
    `${sessionKey}.txt`,
    `teste_sessao_dl.txt`,
  ];
  for (const k of variants) {
    const res = await fetch(`${base}/gateway/v1/mge/visualizadorArquivos.mge?download=S&chaveArquivo=${encodeURIComponent(k)}`, {
      headers: { Authorization: 'Bearer ' + bearer },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    const isHtml = buf.subarray(0, 6).toString('ascii').startsWith('<html');
    const match = buf.toString('utf-8').includes('CONTEUDO TESTE DOWNLOAD SESSAO');
    console.log(`[sessao ${k.slice(0, 45)}] ${res.status} len=${buf.length} htmlErr=${isHtml} CONTEUDO_BATE=${match}`);
    if (isHtml) console.log('   ', buf.toString('latin1').slice(0, 100));
  }
}

bootstrap().catch((e) => console.error('FALHA:', e));
