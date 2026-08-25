import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function inspectTsianxSchema() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== INSPECTING TSIANX COLUMNS & TYPES ===\n');

  try {
    const columns = await gateway.executeQuery(`
      SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE
      FROM ALL_TAB_COLUMNS
      WHERE TABLE_NAME = 'TSIANX'
      ORDER BY COLUMN_ID
    `);
    console.log('Columns in TSIANX:');
    console.table(columns);

    // Também verifica tabelas relacionadas como TSIANXCON, TSIANXDAT, TSIANX...
    const relatedTables = await gateway.executeQuery(`
      SELECT TABLE_NAME
      FROM ALL_TABLES
      WHERE TABLE_NAME LIKE 'TSI%ANX%' OR TABLE_NAME LIKE 'TGF%ANX%'
    `);
    console.log('\nTabelas relacionadas a Anexo (TSI%ANX% / TGF%ANX%):');
    console.table(relatedTables);

  } catch (err: any) {
    console.error('Error inspecting schema:', err?.message || err);
  }
}

inspectTsianxSchema().catch(console.error);
