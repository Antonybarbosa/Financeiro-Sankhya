import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testDownloadComChaveAnexo() {
  const gateway = new SankhyaGateway(new ConfigService());
  const GATEWAY_URL = (gateway as any).config?.url || 'https://api.sandbox.sankhya.com.br';

  console.log('=== TESTE DOWNLOAD via idChaveAnexo (Attach.view → chaveAnexo) ===\n');

  // STEP 1: Obter chave para CODPARC=41858 (tem BLOB na TSIATA)
  console.log('STEP 1: Obtendo idChaveAnexo via Attach.view (CODATA=41858)...');
  const resView = await (gateway as any).serviceCall('Attach.view', {
    serviceName: 'Attach.view',
    requestBody: {
      anexo: {
        codata: 41858,
        sequencia: 0,
        tipo: 'P',
        descricao: 'Documento 2',
        tipoConteudo: 'N',
      },
      clientEventList: {
        clientEvent: [
          { $: 'parceiro.mostra.mensagem.criticaie' },
          { $: 'br.com.sankhya.mgecore.ie.repetida.transportadora' },
        ],
      },
    },
  }, 'mge');

  const idChaveAnexo = resView?.responseBody?.chaveAnexo?.idChaveAnexo;
  const tipoConteudo = resView?.responseBody?.chaveAnexo?.tipoConteudo;
  console.log(`  idChaveAnexo: ${idChaveAnexo}`);
  console.log(`  tipoConteudo: ${tipoConteudo}`);
  console.log(`  Resposta completa:`, JSON.stringify(resView?.responseBody, null, 2));

  if (!idChaveAnexo) {
    console.log('  ❌ Sem idChaveAnexo na resposta');
    return;
  }

  // STEP 2: Tentar baixar usando o idChaveAnexo via visualizadorArquivos.mge
  const token = await (gateway as any).getToken();

  const urlVariants = [
    `${GATEWAY_URL}/gateway/v1/mge/visualizadorArquivos.mge?download=S&chaveArquivo=${encodeURIComponent(idChaveAnexo)}`,
    `${GATEWAY_URL}/gateway/v1/mge/visualizadorArquivos.mge?download=S&idChaveAnexo=${encodeURIComponent(idChaveAnexo)}`,
    `${GATEWAY_URL}/gateway/v1/mge/visualizadorArquivos.mge?idChaveAnexo=${encodeURIComponent(idChaveAnexo)}`,
    `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=Attach.download&outputType=json`,
  ];

  for (const url of urlVariants) {
    console.log(`\nSTEP 2: Testando URL: ${url.substring(0, 120)}...`);
    try {
      let resp: Response;
      if (url.includes('Attach.download')) {
        // POST com body para Attach.download
        resp = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceName: 'Attach.download',
            requestBody: { idChaveAnexo, tipoConteudo },
          }),
        });
      } else {
        resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      }

      const ct = resp.headers.get('content-type') || '';
      const buffer = Buffer.from(await resp.arrayBuffer());
      const first50 = buffer.subarray(0, 50).toString('utf8').replace(/[\r\n]/g, ' ');
      console.log(`  Status: ${resp.status} | CT: ${ct} | Size: ${buffer.length} bytes`);
      console.log(`  Primeiros 50 bytes: ${first50}`);

      if (!ct.includes('text/html') && !first50.includes('<html') && buffer.length > 100) {
        console.log('  ✅ ARQUIVO VÁLIDO OBTIDO!');
        const outPath = path.join(__dirname, `download_idchave_${Date.now()}.bin`);
        fs.writeFileSync(outPath, buffer);
        console.log(`  Salvo em: ${outPath}`);
        console.log(`  Magic bytes: ${buffer.subarray(0, 8).toString('hex').toUpperCase()}`);
        break;
      } else {
        console.log('  ❌ Resposta inválida (HTML ou vazia)');
        if (buffer.length < 500) console.log(`  Conteúdo: ${buffer.toString('utf8').substring(0, 200)}`);
      }
    } catch (err: any) {
      console.log(`  ❌ Erro: ${err?.message?.substring(0, 150)}`);
    }
  }

  // STEP 3: Tentar via Attach.download como serviceCall
  console.log('\nSTEP 3: Attach.download via serviceCall...');
  try {
    const resDl = await (gateway as any).serviceCall('Attach.download', {
      serviceName: 'Attach.download',
      requestBody: { idChaveAnexo, tipoConteudo },
    }, 'mge');
    console.log('  Attach.download resposta:', JSON.stringify(resDl?.responseBody || resDl, null, 2).substring(0, 500));
  } catch (err: any) {
    console.log('  Attach.download erro:', err?.message?.substring(0, 300));
  }

  // STEP 4: Verificar os outros serviços de download
  const downloadServices = ['Attach.getContent', 'Attach.read', 'Attach.get', 'Attach.fetch'];
  for (const svc of downloadServices) {
    try {
      const res = await (gateway as any).serviceCall(svc, {
        serviceName: svc,
        requestBody: { idChaveAnexo, tipoConteudo, codata: 41858, sequencia: 0, tipo: 'P' },
      }, 'mge');
      console.log(`\n  ✅ ${svc} funcionou:`, JSON.stringify(res?.responseBody, null, 2).substring(0, 300));
    } catch (err: any) {
      const msg = err?.message?.substring(0, 100);
      if (msg?.includes('não encontrado') || msg?.includes('not found')) {
        console.log(`  ❌ ${svc}: não existe`);
      } else {
        console.log(`  ✅ ${svc} existe (erro de param): ${msg}`);
      }
    }
  }
}

testDownloadComChaveAnexo().catch(console.error);
