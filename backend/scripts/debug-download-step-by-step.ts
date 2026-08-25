import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function debugDownloadStepByStep() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== INSPECTING ALL ANEXOS IN TSIANX AND TSIATA ===\n');

  try {
    // 1. Todos os anexos em TSIANX
    const tsianxRows = await gateway.executeQuery(`
      SELECT NUATTACH, NOMEINSTANCIA, PKREGISTRO, NOMEARQUIVO, DESCRICAO, CHAVEARQUIVO, DHCAD
      FROM TSIANX
      ORDER BY NUATTACH DESC
    `);
    console.log(`Total de registros em TSIANX (${tsianxRows.length}):`);
    console.table(tsianxRows);

    // 2. Todos os registros em TSIATA
    const tsiataRows = await gateway.executeQuery(`
      SELECT CODATA, TIPO, DESCRICAO, ARQUIVO, DBMS_LOB.GETLENGTH(CONTEUDO) AS LEN_BYTES, DTALTER
      FROM TSIATA
      ORDER BY CODATA DESC
    `);
    console.log(`\nTotal de registros em TSIATA (${tsiataRows.length}):`);
    console.table(tsiataRows);

  } catch (err: any) {
    console.error('Error debugging:', err?.message || err);
  }
}

debugDownloadStepByStep().catch(console.error);
