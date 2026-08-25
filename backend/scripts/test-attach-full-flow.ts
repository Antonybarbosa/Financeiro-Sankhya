import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

const CODPARC = 6614;

// Arquivo de teste pequeno: PNG 1x1 pixel vermelho válido
const PNG_1PX = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415408d76360f8cfc00000000200017221bc330000000049454e44ae426082',
  'hex'
);

async function testAttachFullFlow() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== TESTE FLUXO COMPLETO: Attach.view (INSERT) + TSIATA READ ===\n');
  console.log(`Parceiro: ${CODPARC}\n`);

  // ------------------------------------------------------------------
  // STEP 1: Verificar sequência atual na TSIATA para este parceiro
  // ------------------------------------------------------------------
  console.log('STEP 1: Verificar TSIATA atual...');
  const antes = await gateway.executeQuery(`
    SELECT CODATA, SEQUENCIA, DESCRICAO, ARQUIVO, TIPOCONTEUDO,
           DBMS_LOB.GETLENGTH(CONTEUDO) AS TAMANHO
    FROM TSIATA WHERE TIPO='P' AND CODATA=${CODPARC} ORDER BY SEQUENCIA
  `);
  console.log(`  Registros antes: ${antes.length}`);
  if (antes.length > 0) console.table(antes);

  const proximaSeq = antes.length > 0 ? Math.max(...antes.map((r: any) => r.SEQUENCIA)) + 1 : 0;
  console.log(`  Próxima SEQUENCIA: ${proximaSeq}\n`);

  // ------------------------------------------------------------------
  // STEP 2: Attach.view com tipoConteudo="P" (INSERT — com conteúdo)
  // ------------------------------------------------------------------
  const descricao = `Teste_API_${Date.now()}`;
  console.log(`STEP 2: Attach.view (INSERT) com tipoConteudo="P", seq=${proximaSeq}, desc="${descricao}"...`);
  try {
    const resInsert = await (gateway as any).serviceCall('Attach.view', {
      serviceName: 'Attach.view',
      requestBody: {
        anexo: {
          codata: CODPARC,
          sequencia: proximaSeq,
          tipo: 'P',
          descricao: descricao,
          tipoConteudo: 'P',
        },
        clientEventList: {
          clientEvent: [
            { $: 'parceiro.mostra.mensagem.criticaie' },
            { $: 'br.com.sankhya.mgecore.ie.repetida.transportadora' },
          ],
        },
      },
    }, 'mge');
    console.log('  Resposta Attach.view (tipoConteudo=P):', JSON.stringify(resInsert?.responseBody || resInsert, null, 2));
  } catch (err: any) {
    console.log('  Attach.view (P) erro:', err?.message?.substring(0, 300));
  }

  // ------------------------------------------------------------------
  // STEP 3: Verificar se criou na TSIATA
  // ------------------------------------------------------------------
  console.log('\nSTEP 3: Verificar TSIATA logo após INSERT...');
  const depois = await gateway.executeQuery(`
    SELECT CODATA, SEQUENCIA, DESCRICAO, ARQUIVO, TIPOCONTEUDO,
           DBMS_LOB.GETLENGTH(CONTEUDO) AS TAMANHO
    FROM TSIATA WHERE TIPO='P' AND CODATA=${CODPARC} ORDER BY SEQUENCIA
  `);
  console.log(`  Registros depois: ${depois.length}`);
  if (depois.length > 0) console.table(depois);
  const novoCriado = depois.find((r: any) => r.DESCRICAO === descricao || r.SEQUENCIA === proximaSeq);
  if (novoCriado) {
    console.log(`  ✅ Registro criado! SEQUENCIA=${novoCriado.SEQUENCIA}, TAMANHO=${novoCriado.TAMANHO}`);
  } else {
    console.log('  ⚠️  Registro NÃO encontrado na TSIATA após INSERT');
  }

  // ------------------------------------------------------------------
  // STEP 4: Tentar Attach.view com tipoConteudo="N" (VIEW — leitura)
  // ------------------------------------------------------------------
  console.log('\nSTEP 4: Attach.view (VIEW) com tipoConteudo="N" para ler...');
  try {
    const resView = await (gateway as any).serviceCall('Attach.view', {
      serviceName: 'Attach.view',
      requestBody: {
        anexo: {
          codata: CODPARC,
          sequencia: proximaSeq,
          tipo: 'P',
          descricao: descricao,
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
    console.log('  Resposta Attach.view (tipoConteudo=N):', JSON.stringify(resView?.responseBody || resView, null, 2));
  } catch (err: any) {
    console.log('  Attach.view (N) erro:', err?.message?.substring(0, 300));
  }

  // ------------------------------------------------------------------
  // STEP 5: Testar com dados de arquivo no body (base64 ou campo extra)
  // ------------------------------------------------------------------
  console.log('\nSTEP 5: Testando Attach.view com arquivo inline (conteudo base64)...');
  const base64Png = PNG_1PX.toString('base64');
  const descricao2 = `Teste_Base64_${Date.now()}`;
  try {
    const resBase64 = await (gateway as any).serviceCall('Attach.view', {
      serviceName: 'Attach.view',
      requestBody: {
        anexo: {
          codata: CODPARC,
          sequencia: proximaSeq + 1,
          tipo: 'P',
          descricao: descricao2,
          arquivo: 'teste_pixel.png',
          tipoConteudo: 'P',
          conteudo: base64Png,          // campo extra: conteúdo em base64
          tipoArquivo: 'image/png',
        },
        clientEventList: {
          clientEvent: [
            { $: 'parceiro.mostra.mensagem.criticaie' },
            { $: 'br.com.sankhya.mgecore.ie.repetida.transportadora' },
          ],
        },
      },
    }, 'mge');
    console.log('  Resposta (com conteudo base64):', JSON.stringify(resBase64?.responseBody || resBase64, null, 2));
  } catch (err: any) {
    console.log('  Erro (com base64):', err?.message?.substring(0, 300));
  }

  // ------------------------------------------------------------------
  // STEP 6: Verificar TSIATA final
  // ------------------------------------------------------------------
  console.log('\nSTEP 6: TSIATA final...');
  const final = await gateway.executeQuery(`
    SELECT CODATA, SEQUENCIA, DESCRICAO, ARQUIVO, TIPOCONTEUDO,
           DBMS_LOB.GETLENGTH(CONTEUDO) AS TAMANHO,
           RAWTOHEX(DBMS_LOB.SUBSTR(CONTEUDO, 4, 1)) AS MAGIC
    FROM TSIATA WHERE TIPO='P' AND CODATA=${CODPARC} ORDER BY SEQUENCIA
  `);
  console.log(`  Total registros: ${final.length}`);
  if (final.length > 0) console.table(final);

  // Se há registros com BLOB, extrai e salva o primeiro
  const comBlob = final.find((r: any) => r.TAMANHO > 0);
  if (comBlob) {
    console.log(`\nSTEP 7: Extraindo BLOB SEQUENCIA=${comBlob.SEQUENCIA} (${comBlob.TAMANHO} bytes)...`);
    const chunkSize = 2000;
    const totalLen = comBlob.TAMANHO;
    const positions: number[] = [];
    for (let pos = 1; pos <= totalLen; pos += chunkSize) positions.push(pos);

    const chunks: string[] = new Array(positions.length);
    const batchSize = 30;
    for (let i = 0; i < positions.length; i += batchSize) {
      const batch = positions.slice(i, i + batchSize);
      await Promise.all(batch.map((pos, idx) => {
        const q = `SELECT RAWTOHEX(DBMS_LOB.SUBSTR(CONTEUDO, ${chunkSize}, ${pos})) AS HEX_CHUNK FROM TSIATA WHERE TIPO='P' AND CODATA=${CODPARC} AND SEQUENCIA=${comBlob.SEQUENCIA}`;
        return gateway.executeQuery(q).then((res: any) => { chunks[i + idx] = res[0]?.HEX_CHUNK || ''; });
      }));
    }

    const buffer = Buffer.concat(chunks.map(h => Buffer.from(h, 'hex')));
    const ext = (comBlob.ARQUIVO || comBlob.DESCRICAO || 'anexo').split('.').pop() || 'bin';
    const outPath = path.join(__dirname, `extracted_seq${comBlob.SEQUENCIA}.${ext}`);
    fs.writeFileSync(outPath, buffer);
    console.log(`  ✅ Arquivo extraído: ${buffer.length} bytes → ${outPath}`);
    console.log(`  Magic: ${buffer.subarray(0, 8).toString('hex').toUpperCase()}`);
  }
}

testAttachFullFlow().catch(console.error);
