import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

const CODPARC = 6614;

async function lerAnexoNovo() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log(`=== LENDO ANEXOS DO PARCEIRO ${CODPARC} (TSIATA + TSIANX) ===\n`);

  // 1. TSIATA — fonte nova (CODATA = CODPARC)
  console.log('--- TSIATA (CODATA=6614, TIPO=P) ---');
  const tsiata = await gateway.executeQuery(`
    SELECT CODATA, SEQUENCIA, DESCRICAO, ARQUIVO, TIPOCONTEUDO, ENDARQUI,
           DBMS_LOB.GETLENGTH(CONTEUDO) AS TAMANHO_BYTES,
           RAWTOHEX(DBMS_LOB.SUBSTR(CONTEUDO, 4, 1)) AS MAGIC,
           TO_CHAR(DTALTER, 'DD/MM/YYYY HH24:MI:SS') AS DTALTER
    FROM TSIATA
    WHERE TIPO = 'P' AND CODATA = ${CODPARC}
    ORDER BY SEQUENCIA
  `);
  console.log(`  Registros: ${tsiata.length}`);
  if (tsiata.length > 0) console.table(tsiata);
  else console.log('  (vazio)\n');

  // 2. TSIANX — fonte antiga (PKREGISTRO = '6614_Parceiro')
  console.log('--- TSIANX (PKREGISTRO like 6614%) ---');
  const tsianx = await gateway.executeQuery(`
    SELECT NUATTACH, NOMEARQUIVO, DESCRICAO, TIPOACESSO, TIPOAPRES, CHAVEARQUIVO,
           TO_CHAR(DHCAD, 'DD/MM/YYYY HH24:MI:SS') AS DHCAD
    FROM TSIANX
    WHERE NOMEINSTANCIA = 'Parceiro'
      AND (PKREGISTRO = '${CODPARC}' OR PKREGISTRO = '${CODPARC}_Parceiro' OR PKREGISTRO LIKE '${CODPARC}%')
    ORDER BY NUATTACH DESC
  `);
  console.log(`  Registros: ${tsianx.length}`);
  if (tsianx.length > 0) console.table(tsianx);
  else console.log('  (vazio)\n');

  // 3. Tenta Attach.view para cada registro TSIATA encontrado
  for (const row of tsiata) {
    console.log(`\n--- Attach.view para SEQUENCIA=${row.SEQUENCIA} (${row.DESCRICAO}) ---`);
    try {
      const resView = await (gateway as any).serviceCall('Attach.view', {
        serviceName: 'Attach.view',
        requestBody: {
          anexo: {
            codata: CODPARC,
            sequencia: row.SEQUENCIA,
            tipo: 'P',
            descricao: row.DESCRICAO,
            tipoConteudo: row.TIPOCONTEUDO || 'N',
          },
          clientEventList: {
            clientEvent: [
              { $: 'parceiro.mostra.mensagem.criticaie' },
              { $: 'br.com.sankhya.mgecore.ie.repetida.transportadora' },
            ],
          },
        },
      }, 'mge');
      console.log('  Attach.view OK:', JSON.stringify(resView?.responseBody, null, 2));
    } catch (err: any) {
      console.log('  Attach.view erro:', err?.message?.substring(0, 200));
    }

    // Se tem BLOB na TSIATA, extrai
    if (row.TAMANHO_BYTES > 0) {
      console.log(`\n  Extraindo BLOB (${row.TAMANHO_BYTES} bytes) via RAWTOHEX em paralelo...`);
      const chunkSize = 2000;
      const positions: number[] = [];
      for (let pos = 1; pos <= row.TAMANHO_BYTES; pos += chunkSize) positions.push(pos);

      const chunks: string[] = new Array(positions.length);
      const batchSize = 30;
      for (let i = 0; i < positions.length; i += batchSize) {
        const batch = positions.slice(i, i + batchSize);
        await Promise.all(batch.map((pos, idx) => {
          const q = `SELECT RAWTOHEX(DBMS_LOB.SUBSTR(CONTEUDO, ${chunkSize}, ${pos})) AS HEX_CHUNK FROM TSIATA WHERE TIPO='P' AND CODATA=${CODPARC} AND SEQUENCIA=${row.SEQUENCIA}`;
          return gateway.executeQuery(q).then((res: any) => { chunks[i + idx] = res[0]?.HEX_CHUNK || ''; });
        }));
        process.stdout.write(`  Batch ${Math.floor(i/batchSize)+1}/${Math.ceil(positions.length/batchSize)}\r`);
      }

      const buffer = Buffer.concat(chunks.map(h => Buffer.from(h, 'hex')));
      const nomeArquivo = (row.ARQUIVO || row.DESCRICAO || `seq${row.SEQUENCIA}`).replace(/[\\/:*?"<>|]/g, '_');
      const outPath = path.join(__dirname, `extraido_${CODPARC}_seq${row.SEQUENCIA}_${nomeArquivo}`);
      fs.writeFileSync(outPath, buffer);
      const magic = buffer.subarray(0, 8).toString('hex').toUpperCase();
      let tipo = 'desconhecido';
      if (magic.startsWith('89504E47')) tipo = 'PNG';
      else if (magic.startsWith('FFD8FF')) tipo = 'JPEG';
      else if (magic.startsWith('25504446')) tipo = 'PDF';
      console.log(`\n  ✅ BLOB extraído! ${buffer.length} bytes → ${outPath}`);
      console.log(`     Magic: ${magic} → ${tipo}`);
    } else {
      console.log(`  ℹ️  Sem BLOB na TSIATA (TAMANHO=${row.TAMANHO_BYTES})`);
    }
  }

  // 4. Tenta Attach.view para cada registro TSIANX encontrado
  for (const row of tsianx) {
    console.log(`\n--- Attach.view via TSIANX (NUATTACH=${row.NUATTACH}, ${row.NOMEARQUIVO}) ---`);
    // Na TSIANX não temos SEQUENCIA diretamente — tentamos com NUATTACH como SEQUENCIA
    // mas também tentamos via AnexoSistemaSP.baixar
    try {
      const resBaixar = await (gateway as any).serviceCall('AnexoSistemaSP.baixar', {
        serviceName: 'AnexoSistemaSP.baixar',
        requestBody: {
          paramsDown: {
            nuAttach: String(row.NUATTACH),
            pkEntity: String(CODPARC),
            nameEntity: 'Parceiro',
            nameAttach: row.NOMEARQUIVO,
            keyAttach: row.CHAVEARQUIVO || '',
          },
        },
      }, 'mge');
      const chave = resBaixar?.responseBody?.chave?.valor;
      console.log(`  AnexoSistemaSP.baixar chave: ${chave}`);
    } catch (err: any) {
      console.log('  AnexoSistemaSP.baixar erro:', err?.message?.substring(0, 200));
    }
  }

  console.log('\n=== FIM ===');
}

lerAnexoNovo().catch(console.error);
