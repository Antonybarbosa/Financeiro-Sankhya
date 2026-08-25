import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function inspectAllTgfparRawColumns() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Inspecionando colunas reais da tabela TGFPAR via ALL_TAB_COLUMNS ===\n');

  const sql = `
    SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH
    FROM ALL_TAB_COLUMNS
    WHERE TABLE_NAME = 'TGFPAR'
    ORDER BY COLUMN_NAME
  `;

  try {
    const list = await gateway.executeQuery(sql);
    console.log(`Total de colunas reais na TGFPAR: ${list.length}`);

    const filtered = list.filter((c: any) => {
      const col = (c.COLUMN_NAME || '').toUpperCase();
      return (
        col.includes('ENT') ||
        col.includes('DELIV') ||
        col.includes('END') ||
        col.includes('BAI') ||
        col.includes('CID') ||
        col.includes('CEP') ||
        col.includes('RUA') ||
        col.includes('LOGR') ||
        col.includes('NUM') ||
        col.includes('COMPL') ||
        col.startsWith('AD_')
      );
    });

    console.log(`\nColunas filtradas na TGFPAR (${filtered.length}):`);
    console.table(filtered);
  } catch (err: any) {
    console.error('Erro:', err?.message || err);
  }
}

inspectAllTgfparRawColumns().catch(console.error);
