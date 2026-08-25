import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function inspectDtalterFields() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Inspecionando colunas de Data de Alteração em TGFPAR e TGFCTT ===\n');

  try {
    const parCols = await gateway.executeQuery(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM ALL_TAB_COLUMNS
      WHERE TABLE_NAME = 'TGFPAR' AND (COLUMN_NAME LIKE '%ALTER%' OR COLUMN_NAME LIKE '%DT%')
    `);
    console.log('Colunas de data/alteração em TGFPAR:');
    console.table(parCols);

    const cttCols = await gateway.executeQuery(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM ALL_TAB_COLUMNS
      WHERE TABLE_NAME = 'TGFCTT' AND (COLUMN_NAME LIKE '%ALTER%' OR COLUMN_NAME LIKE '%DH%' OR COLUMN_NAME LIKE '%DT%')
    `);
    console.log('\nColunas de data/alteração em TGFCTT:');
    console.table(cttCols);

  } catch (err: any) {
    console.error('Erro:', err?.message || err);
  }
}

inspectDtalterFields().catch(console.error);
