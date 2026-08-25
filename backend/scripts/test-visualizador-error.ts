import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

// Vamos ler a mensagem HTML de erro
const NUATTACH = 22;
const CODPARC = 6614;
const NOME_ARQUIVO = 'Declaração de autenticidade.jpeg';
const CHAVE_ORIGINAL = '7aa0f146fe1cb5e5e785faacbfaa5230';

async function readVisualizadorError() {
  const gateway = new SankhyaGateway(new ConfigService());
  const GATEWAY_URL = (gateway as any).config?.url || 'https://api.sandbox.sankhya.com.br';

  // 1. Invocar AnexoSistemaSP.baixar
  const resBaixar = await (gateway as any).serviceCall(
    'AnexoSistemaSP.baixar',
    {
      serviceName: 'AnexoSistemaSP.baixar',
      requestBody: {
        paramsDown: {
          nuAttach: String(NUATTACH),
          pkEntity: String(CODPARC),
          nameEntity: 'Parceiro',
          nameAttach: NOME_ARQUIVO,
          keyAttach: CHAVE_ORIGINAL,
        },
      },
    },
    'mge',
  );

  const chaveTemp = resBaixar?.responseBody?.chave?.valor;
  console.log(`Chave Temporária: ${chaveTemp}\n`);

  const token = await (gateway as any).getToken();
  const url = `${GATEWAY_URL}/gateway/v1/mge/visualizadorArquivos.mge?download=S&chaveArquivo=${encodeURIComponent(chaveTemp)}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  const htmlText = await response.text();
  console.log(`Status: ${response.status}`);
  console.log(`Content-Type: ${response.headers.get('content-type')}`);
  console.log(`Conteúdo completo do HTML retornado pelo servidor:`);
  console.log(htmlText);

  // 2. Testar sem Bearer (apenas cookie ou querystring)
  const url2 = `${GATEWAY_URL}/gateway/v1/mge/visualizadorArquivos.mge?download=S&chaveArquivo=${encodeURIComponent(chaveTemp)}&outputType=json`;
  console.log(`\nTestando com outputType=json: ${url2}`);
  const resp2 = await fetch(url2, { headers: { Authorization: `Bearer ${token}` } });
  const text2 = await resp2.text();
  console.log(`Status: ${resp2.status}, Content-Type: ${resp2.headers.get('content-type')}`);
  console.log(`Resposta:`, text2.substring(0, 300));

  // 3. Testar via serviceCall (JSON API)
  console.log('\nTestando via serviceCall JSON...');
  try {
    const res3 = await (gateway as any).serviceCall('AnexoSistemaSP.download', {
      serviceName: 'AnexoSistemaSP.download',
      requestBody: { chave: { valor: chaveTemp } }
    }, 'mge');
    console.log('AnexoSistemaSP.download resposta:', JSON.stringify(res3, null, 2));
  } catch (e: any) {
    console.log('AnexoSistemaSP.download erro:', e?.message);
  }
}

readVisualizadorError().catch(console.error);
