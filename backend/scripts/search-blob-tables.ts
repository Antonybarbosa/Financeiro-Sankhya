import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function searchBlobTables() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== SEARCHING ALL TABLES WITH BLOB / CLOB / RAW / LONG RAW COLUMNS ===\n');

  try {
    const blobCols = await gateway.executeQuery(`
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
      FROM ALL_TAB_COLUMNS
      WHERE DATA_TYPE IN ('BLOB', 'CLOB', 'LONG RAW', 'RAW')
        AND OWNER NOT IN ('SYS', 'SYSTEM', 'MDSYS', 'CTXSYS', 'XDB')
      ORDER BY TABLE_NAME, COLUMN_NAME
    `);
    console.log(`Encontradas ${blobCols.length} colunas BLOB/CLOB/RAW no Oracle:`);
    console.table(blobCols.slice(0, 100)); // primeiras 100

  } catch (err: any) {
    console.error('Error searching BLOB columns:', err?.message || err);
  }
}

searchBlobTables().catch(console.error);
