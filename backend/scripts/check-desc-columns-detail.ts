import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Tipos das colunas DESCBONIF / DESCFIN / PRAZOPAG / LIMCRED ===');
  const cols = await gateway.executeQuery(`
    SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, DATA_PRECISION, DATA_SCALE
    FROM ALL_TAB_COLUMNS
    WHERE TABLE_NAME = 'TGFPAR'
      AND COLUMN_NAME IN ('DESCBONIF','DESCFIN','PRAZOPAG','LIMCRED','LATITUDE','LONGITUDE','QTDIERAT')
    ORDER BY COLUMN_NAME`);
  console.table(cols);

  console.log('=== Constraints que citam DESCFIN ===');
  const ck = await gateway.executeQuery(`
    SELECT CONSTRAINT_NAME, SEARCH_CONDITION_VC
    FROM ALL_CONSTRAINTS
    WHERE TABLE_NAME = 'TGFPAR' AND CONSTRAINT_TYPE = 'C'
      AND SEARCH_CONDITION_VC LIKE '%DESCFIN%'`);
  console.table(ck);

  console.log('=== Valores distintos em uso (amostra) ===');
  const dist = await gateway.executeQuery(`
    SELECT DESCBONIF, DESCFIN, COUNT(*) AS QTD FROM TGFPAR
    WHERE DESCBONIF IS NOT NULL OR DESCFIN IS NOT NULL
    GROUP BY DESCBONIF, DESCFIN ORDER BY QTD DESC`);
  console.table(dist.slice(0, 15));
}

main().catch(console.error);
