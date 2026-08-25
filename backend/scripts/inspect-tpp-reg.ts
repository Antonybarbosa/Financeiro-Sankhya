import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function inspectTables() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Inspecting TGFTPP (Tipos de Parceiros) ===');
  try {
    const rowsTpp = await gateway.executeQuery(`
      SELECT CODTIPPARC, DESCRTIPPARC FROM TGFTPP WHERE ROWNUM <= 5 ORDER BY CODTIPPARC ASC
    `);
    console.table(rowsTpp);
  } catch (err: any) {
    console.error('Error TGFTPP:', err.message);
  }

  console.log('\n=== Inspecting TSIREG (Regiões) ===');
  try {
    const rowsReg = await gateway.executeQuery(`
      SELECT CODREG, NOMEREG FROM TSIREG WHERE ROWNUM <= 5 ORDER BY CODREG ASC
    `);
    console.table(rowsReg);
  } catch (err: any) {
    console.error('Error TSIREG:', err.message);
  }

  process.exit(0);
}

inspectTables();
