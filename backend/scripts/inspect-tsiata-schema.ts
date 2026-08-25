import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function inspectTsiataSchema() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== INSPECTING TSIATA SCHEMA & CONTENT ===\n');

  try {
    // 1. Inspect TSIATA columns
    const columns = await gateway.executeQuery(`
      SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE
      FROM ALL_TAB_COLUMNS
      WHERE TABLE_NAME = 'TSIATA'
      ORDER BY COLUMN_ID
    `);
    console.log('Columns in TSIATA:');
    console.table(columns);

    // 2. Query rows from TSIATA
    const rows = await gateway.executeQuery(`
      SELECT * FROM TSIATA WHERE ROWNUM <= 10
    `);
    console.log(`\nLinhas encontradas em TSIATA (${rows.length}):`);
    console.log(JSON.stringify(rows, null, 2));

  } catch (err: any) {
    console.error('Error inspecting TSIATA:', err?.message || err);
  }
}

inspectTsiataSchema().catch(console.error);
