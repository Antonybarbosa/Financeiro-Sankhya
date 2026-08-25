import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

// Chave gerada pelo AnexoSistemaSP.baixar para o anexo #22 (Declaração de autenticidade.jpeg) do parceiro #6614
// Use uma chave recente gerada por uma nova chamada
const NUATTACH = 22;
const CODPARC = 6614;
const NOME_ARQUIVO = 'Declaração de autenticidade.jpeg';
const CHAVE_ORIGINAL = '7aa0f146fe1cb5e5e785faacbfaa5230';

async function testDownloadGlobal() {
  const gateway = new SankhyaGateway(new ConfigService());
  const GATEWAY_URL = (gateway as any).config?.url || 'https://api.sandbox.sankhya.com.br';

  console.log('=== TESTE DOWNLOAD ARQUIVO GLO (REPOSITÓRIO GLOBAL) ===\n');
  console.log(`GATEWAY_URL: ${GATEWAY_URL}`);
  console.log(`Parceiro: ${CODPARC}, NUATTACH: ${NUATTACH}, Arquivo: ${NOME_ARQUIVO}`);
  console.log(`Chave Original CHAVEARQUIVO: ${CHAVE_ORIGINAL}\n`);

  // 1. Invocar AnexoSistemaSP.baixar para gerar chave temporária
  console.log('1. Invocando AnexoSistemaSP.baixar...');
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
  console.log(`  Resposta: ${JSON.stringify(resBaixar?.responseBody)}`);
  console.log(`  Chave Temporária: ${chaveTemp}\n`);

  if (!chaveTemp) {
    console.error('❌ AnexoSistemaSP.baixar não retornou chave temporária');
    return;
  }

  // 2. Testar download via visualizadorArquivos.mge com vários formatos de URL
  const token = await (gateway as any).getToken();
  
  const urlVariants = [
    `${GATEWAY_URL}/gateway/v1/mge/visualizadorArquivos.mge?download=S&chaveArquivo=${encodeURIComponent(chaveTemp)}`,
    `${GATEWAY_URL}/gateway/v1/mgebase/visualizadorArquivos.mge?download=S&chaveArquivo=${encodeURIComponent(chaveTemp)}`,
    `${GATEWAY_URL}/gateway/v1/mge/visualizadorArquivos.mge?chaveArquivo=${encodeURIComponent(chaveTemp)}`,
    `${GATEWAY_URL}/gateway/v1/mge/downloadArquivo.mge?chaveArquivo=${encodeURIComponent(chaveTemp)}`,
  ];

  for (const url of urlVariants) {
    console.log(`\n2. Testando URL: ${url}`);
    try {
      const response = await fetch(url, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Accept': '*/*',
        },
      });
      
      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || 'unknown';
      const firstBytes = buffer.subarray(0, 50).toString('utf8');
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${contentType}`);
      console.log(`   Tamanho: ${buffer.length} bytes`);
      console.log(`   Primeiros 50 bytes: ${firstBytes.replace(/[\r\n]/g, ' ')}`);
      
      if (!contentType.includes('text/html') && !firstBytes.includes('<html') && buffer.length > 100) {
        console.log(`   ✅ ARQUIVO VÁLIDO ENCONTRADO!`);
        break;
      } else {
        console.log(`   ❌ Resposta HTML (erro do servidor)`);
      }
    } catch (err: any) {
      console.log(`   ❌ Erro: ${err?.message}`);
    }
  }
}

testDownloadGlobal().catch(console.error);
