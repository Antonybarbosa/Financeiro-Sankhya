import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const CODPARC = 6614;

async function testAttachView() {
  const gateway = new SankhyaGateway(new ConfigService());
  const GATEWAY_URL = (gateway as any).config?.url || 'https://api.sandbox.sankhya.com.br';

  console.log('=== TESTE Attach.view e Attach.remove via OAuth Bearer ===\n');
  console.log(`GATEWAY_URL: ${GATEWAY_URL}\n`);

  // 1. Testar Attach.view via serviceCall (Gateway OAuth)
  console.log('1. Testando Attach.view via serviceCall...');
  try {
    const res = await (gateway as any).serviceCall('Attach.view', {
      serviceName: 'Attach.view',
      requestBody: {
        anexo: {
          codata: CODPARC,
          sequencia: 0,
          tipo: 'P',
          descricao: 'Teste API Attach',
          tipoConteudo: 'N',  // N = view only, sem conteúdo físico
        },
        clientEventList: {
          clientEvent: [
            { $: 'parceiro.mostra.mensagem.criticaie' },
            { $: 'br.com.sankhya.mgecore.ie.repetida.transportadora' },
          ],
        },
      },
    }, 'mge');
    console.log('  ✅ Attach.view funcionou!');
    console.log('  Resposta:', JSON.stringify(res?.responseBody || res, null, 2));
  } catch (err: any) {
    console.log('  ❌ Attach.view via serviceCall falhou:', err?.message?.substring(0, 300));
  }

  // 2. Testar via fetch direto com Bearer token (URL exata do serviço)
  console.log('\n2. Testando Attach.view via fetch direto com Bearer...');
  try {
    const token = await (gateway as any).getToken();
    const url = `${GATEWAY_URL}/gateway/v1/mge/service.sbr?serviceName=Attach.view&outputType=json`;
    const body = {
      serviceName: 'Attach.view',
      requestBody: {
        anexo: {
          codata: CODPARC,
          sequencia: 0,
          tipo: 'P',
          descricao: 'Teste API Attach',
          tipoConteudo: 'N',
        },
        clientEventList: {
          clientEvent: [
            { $: 'parceiro.mostra.mensagem.criticaie' },
            { $: 'br.com.sankhya.mgecore.ie.repetida.transportadora' },
          ],
        },
      },
    };
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    console.log(`  Status: ${resp.status}`);
    console.log(`  Resposta: ${text.substring(0, 500)}`);
  } catch (err: any) {
    console.log('  ❌ Fetch direto falhou:', err?.message?.substring(0, 200));
  }

  // 3. Listar registros TSIATA do parceiro (nova chave: CODATA=CODPARC, TIPO='P')
  console.log('\n3. Listando TSIATA via CODATA=CODPARC...');
  const tsiataRows = await gateway.executeQuery(`
    SELECT 
      CODATA, SEQUENCIA, TIPO, DESCRICAO, ARQUIVO, TIPOCONTEUDO, ENDARQUI,
      DBMS_LOB.GETLENGTH(CONTEUDO) AS TAMANHO_BYTES,
      TO_CHAR(DTALTER, 'DD/MM/YYYY HH24:MI:SS') AS DTALTER
    FROM TSIATA
    WHERE TIPO = 'P' AND CODATA = ${CODPARC}
    ORDER BY SEQUENCIA
  `);
  console.log(`  Registros TSIATA para parceiro ${CODPARC}: ${tsiataRows.length}`);
  if (tsiataRows.length > 0) console.table(tsiataRows);
  else console.log('  (Nenhum registro)');

  // 4. Verificar o que está na TSIATA para CODATA=41858 (que sabemos ter BLOB)
  console.log('\n4. TSIATA para CODATA=41858 (tem BLOB confirmado)...');
  const blob41858 = await gateway.executeQuery(`
    SELECT CODATA, SEQUENCIA, TIPO, DESCRICAO, ARQUIVO, TIPOCONTEUDO,
           DBMS_LOB.GETLENGTH(CONTEUDO) AS TAMANHO_BYTES
    FROM TSIATA
    WHERE TIPO = 'P' AND CODATA = 41858
  `);
  console.table(blob41858);
}

testAttachView().catch(console.error);
