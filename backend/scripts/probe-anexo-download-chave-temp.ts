import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const CODPARC = 6614;

async function bootstrap() {
  const gateway = new SankhyaGateway(new ConfigService());

  // 1. Obter o valor da chave temporária do AnexoSistemaSP.baixar para NUATTACH=18 (ou NUATTACH=7)
  const resBaixar = await gateway.serviceCall(
    'AnexoSistemaSP.baixar',
    {
      serviceName: 'AnexoSistemaSP.baixar',
      requestBody: {
        paramsDown: {
          nuAttach: '18',
          pkEntity: String(CODPARC),
          nameEntity: 'Parceiro',
          nameAttach: 'teste_roundtrip_api.txt',
          keyAttach: '571ea7ac479ba3f9dc0f46ab3b404a40',
        },
        clientEventList: {
          clientEvent: [
            { $: 'parceiro.mostra.mensagem.criticaie' },
            { $: 'br.com.sankhya.mgecore.ie.repetida.transportadora' },
          ],
        },
      },
    },
    'mge',
  );

  const chaveTemp = resBaixar?.responseBody?.chave?.valor;
  console.log('Chave Temporária gerada por AnexoSistemaSP.baixar:', chaveTemp);

  if (!chaveTemp) return;

  const token = await gateway.getToken();

  // 2. Testar buscar com chaveTemp em visualizadorArquivos.mge e outras URLs
  const urlsToTest = [
    `${process.env.GATEWAY_URL}/gateway/v1/mge/visualizadorArquivos.mge?download=S&chaveArquivo=${encodeURIComponent(chaveTemp)}`,
    `${process.env.GATEWAY_URL}/gateway/v1/mge/visualizadorArquivos.mge?chaveArquivo=${encodeURIComponent(chaveTemp)}`,
    `${process.env.GATEWAY_URL}/gateway/v1/mge/visualizador.mge?chaveArquivo=${encodeURIComponent(chaveTemp)}`,
    `${process.env.GATEWAY_URL}/gateway/v1/mge/downloadFile.mge?chaveArquivo=${encodeURIComponent(chaveTemp)}`,
    `${process.env.GATEWAY_URL}/gateway/v1/mge/visualizadorArquivos.mge?chave=${encodeURIComponent(chaveTemp)}`,
  ];

  for (const url of urlsToTest) {
    const r = await fetch(url, {
      headers: { Authorization: 'Bearer ' + token },
    });
    const buf = Buffer.from(await r.arrayBuffer());
    const isHtml = buf.subarray(0, 6).toString('ascii').startsWith('<html>') || buf.subarray(0, 6).toString('ascii').startsWith('<!DOC');
    console.log(`\nURL: ${url}`);
    console.log(`Status: ${r.status} ${r.statusText} | Content-Type: ${r.headers.get('content-type')} | Len: ${buf.length} | isHtml: ${isHtml}`);
    if (!isHtml) {
      console.log('>>> CONTEÚDO RECEBIDO:', buf.toString('utf-8').slice(0, 200));
    } else {
      console.log('   Body preview:', buf.toString('latin1').slice(0, 150).replace(/\s+/g, ' '));
    }
  }
}

bootstrap().catch(console.error);
