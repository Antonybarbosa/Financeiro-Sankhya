import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testReadFullTsiataBlob() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== READING FULL BLOB FROM TSIATA IN PARALLEL (CODATA = 41858) ===\n');

  try {
    const sizeRes = await gateway.executeQuery(`
      SELECT DBMS_LOB.GETLENGTH(CONTEUDO) AS TOTAL_LEN, ARQUIVO, DESCRICAO
      FROM TSIATA
      WHERE CODATA = 41858 AND TIPO = 'P'
    `);

    const totalLen = sizeRes[0]?.TOTAL_LEN;
    const nomeArquivo = sizeRes[0]?.ARQUIVO || 'anexo.bin';

    console.log(`Tamanho total do arquivo ${nomeArquivo}: ${totalLen} bytes`);
    if (!totalLen) return;

    const chunkSize = 2000;
    const positions: number[] = [];
    for (let pos = 1; pos <= totalLen; pos += chunkSize) {
      positions.push(pos);
    }

    console.log(`Total de partes a baixar: ${positions.length}`);

    // Executa em lotes de 15 requisições paralelas
    const batchSize = 15;
    const resultsHex: string[] = new Array(positions.length);

    for (let i = 0; i < positions.length; i += batchSize) {
      const batchPositions = positions.slice(i, i + batchSize);
      const batchPromises = batchPositions.map((pos, idx) => {
        const query = `SELECT RAWTOHEX(DBMS_LOB.SUBSTR(CONTEUDO, ${chunkSize}, ${pos})) AS HEX_CHUNK FROM TSIATA WHERE CODATA = 41858 AND TIPO = 'P'`;
        return gateway.executeQuery(query).then((res: any) => {
          resultsHex[i + idx] = res[0]?.HEX_CHUNK || '';
        });
      });

      await Promise.all(batchPromises);
      console.log(`Progresso: ${Math.min(i + batchSize, positions.length)}/${positions.length} partes...`);
    }

    const buffers = resultsHex.map(hex => Buffer.from(hex, 'hex'));
    const fullBuffer = Buffer.concat(buffers);

    console.log(`\n[SUCESSO] Buffer total reconstruído: ${fullBuffer.length} bytes (Esperado: ${totalLen})`);

    const outDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const outPath = path.join(outDir, `test_${nomeArquivo}`);
    fs.writeFileSync(outPath, fullBuffer);
    console.log(`Arquivo salvo com sucesso em: ${outPath}`);
    console.log(`Verificação de Magic Number (PNG?): ${fullBuffer.subarray(0, 8).toString('hex')}`);

  } catch (err: any) {
    console.error('Error reading full BLOB:', err?.message || err);
  }
}

testReadFullTsiataBlob().catch(console.error);
