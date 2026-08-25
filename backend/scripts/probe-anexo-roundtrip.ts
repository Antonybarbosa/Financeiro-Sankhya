import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

const CODPARC = 6614;

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

async function bootstrap() {
  const token = await getToken();
  const base = process.env.GATEWAY_URL!;
  const sessionKey = `ANEXO_SISTEMA_Parceiro_${CODPARC}`;

  // 0. anexos antes
  const q0 = await fetch(`${base}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: `SELECT NUATTACH, NOMEARQUIVO, CHAVEARQUIVO FROM TSIANX WHERE NOMEINSTANCIA='Parceiro' AND PKREGISTRO LIKE '${CODPARC}%' ORDER BY NUATTACH` } }),
  });
  const j0 = await q0.json();
  console.log('ANEXOS ANTES:', JSON.stringify(j0.responseBody?.rows));

  // 1. upload multipart sessionUpload.mge
  const testContent = Buffer.from(`Teste roundtrip anexo API — ${new Date().toISOString()}\n`, 'utf-8');
  const fd = new FormData();
  fd.append('arquivo', new Blob([testContent], { type: 'application/octet-stream' }), 'teste_roundtrip_api.txt');

  const upUrl = `${base}/gateway/v1/mge/sessionUpload.mge?sessionkey=${encodeURIComponent(sessionKey)}&fitem=S&salvar=S&useCache=N`;
  const upRes = await fetch(upUrl, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, Accept: 'text/html' },
    body: fd,
  });
  const upText = await upRes.text();
  console.log('\nUPLOAD status', upRes.status, '::', upText.slice(0, 300));

  // 2. AnexoSistemaSP.salvar com fileSelect=1
  const salvarRes = await fetch(`${base}/gateway/v1/mge/service.sbr?serviceName=AnexoSistemaSP.salvar&outputType=json`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceName: 'AnexoSistemaSP.salvar',
      requestBody: {
        params: {
          pkEntity: String(CODPARC),
          keySession: sessionKey,
          nameEntity: 'Parceiro',
          description: 'Teste Roundtrip API',
          keyAttach: '',
          typeAcess: 'ALL',
          typeApres: 'LOC',
          nuAttach: '',
          nameAttach: 'teste_roundtrip_api.txt',
          resourceID: 'br.com.sankhya.core.cad.parceiros',
          fileSelect: 1,
          oldFile: '',
        },
      },
    }),
  });
  const salvarJson = await salvarRes.json();
  console.log('\nSALVAR status', salvarJson.status, JSON.stringify(salvarJson.responseBody || salvarJson.statusMessage).slice(0, 300));

  // 3. ler TSIANX de novo
  const q1 = await fetch(`${base}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: `SELECT NUATTACH, NOMEARQUIVO, CHAVEARQUIVO, PKREGISTRO FROM TSIANX WHERE NOMEINSTANCIA='Parceiro' AND PKREGISTRO LIKE '${CODPARC}%' ORDER BY NUATTACH` } }),
  });
  const j1 = await q1.json();
  console.log('\nANEXOS DEPOIS:', JSON.stringify(j1.responseBody?.rows));

  const meta = (j1.responseBody?.fieldsMetadata || []).map((f: any) => f.name);
  const rows: any[][] = j1.responseBody?.rows || [];
  const novos = rows.filter((r) => r[meta.indexOf('NOMEARQUIVO')] === 'teste_roundtrip_api.txt');
  const novo = novos[0];
  if (!novo) {
    console.log('\n!! anexo novo não encontrado — abortar');
    return;
  }
  const nuAttach = novo[meta.indexOf('NUATTACH')];
  const chave = novo[meta.indexOf('CHAVEARQUIVO')];
  console.log(`\nNOVO ANEXO nuAttach=${nuAttach} chaveArquivo=${chave}`);

  // 4. tentar download
  const variants = [
    ['chave-nua', chave],
    ['Sistema/Anexos/Parceiro/chave', `Sistema/Anexos/Parceiro/${chave}`],
  ];
  for (const [label, c] of variants) {
    const dl = await fetch(`${base}/gateway/v1/mge/visualizadorArquivos.mge?download=S&chaveArquivo=${encodeURIComponent(c!)}`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    const buf = Buffer.from(await dl.arrayBuffer());
    const isHtml = buf.subarray(0, 6).toString('ascii').startsWith('<html>');
    console.log(`\nDL [${label}] status=${dl.status} len=${buf.length} htmlErr=${isHtml}`);
    if (!isHtml) console.log('   conteúdo:', buf.toString('utf-8').slice(0, 100));
    else console.log('   ', buf.toString('latin1').slice(0, 120));
  }

  // 5. cleanup
  const del = await fetch(`${base}/gateway/v1/mge/service.sbr?serviceName=AnexoSistemaSP.excluir&outputType=json`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceName: 'AnexoSistemaSP.excluir',
      requestBody: { paramsDelete: { nuAttach: String(nuAttach), pkEntity: String(CODPARC), nameEntity: 'Parceiro', nameAttach: 'teste_roundtrip_api.txt', keyAttach: '' } },
    }),
  });
  const delJson = await del.json();
  console.log('\nCLEANUP excluir status', delJson.status, delJson.statusMessage || '');
}

bootstrap().catch((e) => console.error('FALHA:', e));
