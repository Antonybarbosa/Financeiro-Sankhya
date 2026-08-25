import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function explorarCamposEExtrairBlob() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== PARTE 1: CAMPOS DE TSIANX E TSIATA VIA TDDCAM ===\n');
  const campos = await gateway.executeQuery(`
    SELECT NUCAMPO, NOMECAMPO, DESCRCAMPO, CAM.ORDEM, TIPCAMPO
    FROM TDDCAM CAM
    WHERE NOMETAB IN ('TSIANX', 'TSIATA')
    ORDER BY NOMETAB, CAM.ORDEM
  `);
  console.log(`Campos (${campos.length}):`);
  console.table(campos);

  console.log('\n=== PARTE 2: REGISTROS TSIATA COM MAGIC BYTES ===\n');
  const tsiataRows = await gateway.executeQuery(`
    SELECT 
      CODATA, TIPO, DESCRICAO, ARQUIVO, TIPOCONTEUDO, ENDARQUI, SEQUENCIA,
      DBMS_LOB.GETLENGTH(CONTEUDO) AS TAMANHO_BYTES,
      RAWTOHEX(DBMS_LOB.SUBSTR(CONTEUDO, 8, 1)) AS MAGIC_BYTES
    FROM TSIATA
    WHERE CONTEUDO IS NOT NULL AND DBMS_LOB.GETLENGTH(CONTEUDO) > 0
    ORDER BY CODATA DESC
  `);
  console.table(tsiataRows);

  for (const row of tsiataRows) {
    const magic = (row.MAGIC_BYTES || '').toUpperCase();
    let tipo = 'desconhecido';
    if (magic.startsWith('89504E47')) tipo = 'PNG';
    else if (magic.startsWith('FFD8FF')) tipo = 'JPEG';
    else if (magic.startsWith('25504446')) tipo = 'PDF';
    else if (magic.startsWith('504B0304')) tipo = 'ZIP/DOCX/XLSX';
    console.log(`CODATA=${row.CODATA} | ${row.ARQUIVO} | ${row.TAMANHO_BYTES} bytes | Magic=${magic} | Tipo=${tipo}`);
  }

  console.log('\n=== PARTE 3: TSIANX x TSIATA - CHAVE DE JOIN? ===\n');
  const tsianxRows = await gateway.executeQuery(`
    SELECT NUATTACH, NOMEARQUIVO, CHAVEARQUIVO, TIPOAPRES FROM TSIANX ORDER BY NUATTACH
  `);
  const codataSet = tsiataRows.map((r: any) => r.CODATA);
  const match = tsianxRows.filter((r: any) => codataSet.includes(r.NUATTACH));
  console.log('NUATTACH que coincidem com CODATA na TSIATA:', match.length > 0 ? match : '(nenhum)');

  // Parte 4: Extração PARALELA do BLOB (batchSize=30 simultâneos)
  const parceiroBlobRow = tsiataRows.find((r: any) => r.TIPO === 'P');
  if (!parceiroBlobRow) { console.log('Nenhum registro de parceiro (TIPO=P) com BLOB na TSIATA.'); return; }

  console.log(`\n=== PARTE 4: EXTRAINDO BLOB CODATA=${parceiroBlobRow.CODATA} (${parceiroBlobRow.ARQUIVO}) em PARALELO ===\n`);
  const totalLen = parceiroBlobRow.TAMANHO_BYTES;
  const chunkSize = 2000;
  const batchSize = 30;

  const positions: number[] = [];
  for (let pos = 1; pos <= totalLen; pos += chunkSize) positions.push(pos);

  const resultsHex: string[] = new Array(positions.length);
  const codata = parceiroBlobRow.CODATA;

  for (let i = 0; i < positions.length; i += batchSize) {
    const batch = positions.slice(i, i + batchSize);
    await Promise.all(batch.map((pos, idx) => {
      const q = `SELECT RAWTOHEX(DBMS_LOB.SUBSTR(CONTEUDO, ${chunkSize}, ${pos})) AS HEX_CHUNK FROM TSIATA WHERE CODATA = ${codata}`;
      return gateway.executeQuery(q).then((res: any) => { resultsHex[i + idx] = res[0]?.HEX_CHUNK || ''; });
    }));
    process.stdout.write(`  Batch ${Math.floor(i/batchSize)+1}/${Math.ceil(positions.length/batchSize)} concluído\r`);
  }

  const buffer = Buffer.concat(resultsHex.map(h => Buffer.from(h, 'hex')));
  const outPath = path.join(__dirname, `blob_${codata}_${parceiroBlobRow.ARQUIVO}`);
  fs.writeFileSync(outPath, buffer);
  console.log(`\n✅ Arquivo extraído! ${buffer.length} bytes -> ${outPath}`);

  // Valida magic bytes
  const magic = buffer.subarray(0, 8).toString('hex').toUpperCase();
  console.log(`   Magic bytes: ${magic}`);
  if (magic.startsWith('89504E47')) console.log('   Tipo: PNG ✅');
  else if (magic.startsWith('FFD8FF')) console.log('   Tipo: JPEG ✅');
  else if (magic.startsWith('25504446')) console.log('   Tipo: PDF ✅');
}

explorarCamposEExtrairBlob().catch(console.error);
