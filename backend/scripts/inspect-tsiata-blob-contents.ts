import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function inspectTsiataBlobContents() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== READING BLOB CONTEUDO FROM TSIATA ===\n');

  try {
    // 1. Testa tamanho do BLOB e primeiros bytes via RAWTOHEX / DBMS_LOB
    const rows = await gateway.executeQuery(`
      SELECT CODATA, TIPO, DESCRICAO, ARQUIVO,
             DBMS_LOB.GETLENGTH(CONTEUDO) AS TAMANHO_BYTES,
             RAWTOHEX(DBMS_LOB.SUBSTR(CONTEUDO, 50, 1)) AS PRIMEIROS_50_HEX
      FROM TSIATA
      WHERE CODATA = 41858 OR TIPO = 'P'
    `);
    console.log('Registros do Parceiro em TSIATA:');
    console.table(rows);

    if (rows.length > 0 && rows[0].PRIMEIROS_50_HEX) {
      const hex = rows[0].PRIMEIROS_50_HEX;
      const buf = Buffer.from(hex, 'hex');
      console.log('\nPreview dos primeiros 50 bytes do BLOB:');
      console.log('Hex:', hex);
      console.log('ASCII/Text:', buf.toString('ascii'));
    }

  } catch (err: any) {
    console.error('Error reading TSIATA BLOB:', err?.message || err);
  }
}

inspectTsiataBlobContents().catch(console.error);
