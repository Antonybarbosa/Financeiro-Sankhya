import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function inspectTgfcttFields() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Imprimindo campos da TGFCTT ===\n');

  const sql = `
    SELECT NOMECAMPO, DESCRCAMPO
    FROM TDDCAM
    WHERE NOMETAB = 'TGFCTT'
    ORDER BY NOMECAMPO
  `;

  try {
    const list = await gateway.executeQuery(sql);
    console.table(list);
  } catch (err: any) {
    console.error('Erro:', err?.message || err);
  }
}

inspectTgfcttFields().catch(console.error);
