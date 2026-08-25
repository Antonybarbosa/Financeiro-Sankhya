import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function inspectAllTsiata() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== INSPECTING ALL ROWS IN TSIATA ===\n');

  try {
    const rows = await gateway.executeQuery(`
      SELECT CODATA, TIPO, DESCRICAO, ARQUIVO, CODUSU, DTALTER, TIPOCONTEUDO, EDITA, CODEMP, ENDARQUI, SEQUENCIA, LINK, IDENTIFICACAOARQUIVO
      FROM TSIATA
    `);
    console.log(`Total de registros em TSIATA: ${rows.length}`);
    console.table(rows);

  } catch (err: any) {
    console.error('Error inspecting TSIATA:', err?.message || err);
  }
}

inspectAllTsiata().catch(console.error);
