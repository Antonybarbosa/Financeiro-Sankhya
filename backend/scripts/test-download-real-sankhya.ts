import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const CODPARC = 6614;

async function testDownloadRealSankhya() {
  const gateway = new SankhyaGateway(new ConfigService());
  const token = await gateway.getToken();

  console.log('=== TESTE DE DOWNLOAD DE ANEXO PARA PARCEIRO #6614 ===\n');

  // 1. Busca anexo nuAttach 17 do parceiro 6614
  const rows = await gateway.executeQuery(`
    SELECT NUATTACH, NOMEINSTANCIA, PKREGISTRO, NOMEARQUIVO, DESCRICAO, CHAVEARQUIVO
    FROM TSIANX
    WHERE NOMEINSTANCIA = 'Parceiro' AND PKREGISTRO LIKE '${CODPARC}%' AND NUATTACH = 17
  `);

  console.log('Anexo #17 em TSIANX:', rows[0]);
  if (!rows[0]) return;

  const anx = rows[0];

  // 2. Executa AnexoSistemaSP.baixar
  const resBaixar = await gateway.serviceCall(
    'AnexoSistemaSP.baixar',
    {
      serviceName: 'AnexoSistemaSP.baixar',
      requestBody: {
        paramsDown: {
          nuAttach: String(anx.NUATTACH),
          pkEntity: String(CODPARC),
          nameEntity: 'Parceiro',
          nameAttach: anx.NOMEARQUIVO,
          keyAttach: anx.CHAVEARQUIVO,
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

  console.log('\nAnexoSistemaSP.baixar retornou:');
  console.log(JSON.stringify(resBaixar, null, 2));

  const chaveTemp = resBaixar?.responseBody?.chave?.valor;
  console.log('\nChave Temporária gerada:', chaveTemp);

  if (!chaveTemp) return;

  // 3. Testa recuperar os bytes através de visualizadorArquivos.mge no Gateway
  const downloaded = await gateway.downloadArquivo(chaveTemp);
  console.log('\nResultado do downloadArquivo (Gateway):', downloaded ? `SUCESSO (${downloaded.buffer.length} bytes, type: ${downloaded.contentType})` : 'NULL (Não encontrado no disco do gateway)');

  if (downloaded) {
    console.log('CONTEÚDO DO ARQUIVO:');
    console.log(downloaded.buffer.toString('utf-8').slice(0, 300));
  }
}

testDownloadRealSankhya().catch(console.error);
