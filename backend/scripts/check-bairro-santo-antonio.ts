import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const g = new SankhyaGateway(new ConfigService());
  const r = await g.executeQuery(`
    SELECT BAI.CODBAI, BAI.NOMEBAI FROM TSIBAI BAI
    WHERE UPPER(BAI.NOMEBAI) LIKE '%SANTO ANTONIO%' AND BAI.CODBAI > 0 AND ROWNUM <= 10
    ORDER BY BAI.NOMEBAI`);
  console.table(r);
}

main().catch(e => console.error(e.message));
