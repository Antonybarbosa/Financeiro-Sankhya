import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const gateway = new SankhyaGateway(new ConfigService());
  const sql = `
    SELECT CONSTRAINT_NAME, SEARCH_CONDITION_VC
    FROM ALL_CONSTRAINTS
    WHERE TABLE_NAME = 'TGFPAR'
      AND CONSTRAINT_TYPE = 'C'
      AND (CONSTRAINT_NAME LIKE '%DESC%' OR CONSTRAINT_NAME LIKE '%FIN%' OR CONSTRAINT_NAME LIKE '%CRED%' OR CONSTRAINT_NAME LIKE '%PRAZO%' OR CONSTRAINT_NAME LIKE '%LAT%' OR CONSTRAINT_NAME LIKE '%LON%')
    ORDER BY CONSTRAINT_NAME`;
  const rows = await gateway.executeQuery(sql);
  console.table(rows);
}

main().catch(console.error);
