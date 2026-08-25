import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function dumpAll310Fields() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Imprimindo TODOS os 310 campos da tabela TGFPAR no TDDCAM ===\n');

  const sql = `
    SELECT
        CAM.NUCAMPO,
        CAM.NOMECAMPO,
        CAM.DESCRCAMPO,
        CAM.TIPCAMPO
    FROM TDDCAM CAM
    WHERE CAM.NOMETAB = 'TGFPAR'
    ORDER BY CAM.NOMECAMPO
  `;

  try {
    const list = await gateway.executeQuery(sql);
    console.log(`Total retornado: ${list.length}`);
    for (const c of list) {
      console.log(`${c.NOMECAMPO.padEnd(25)} | ${c.DESCRCAMPO}`);
    }
  } catch (err: any) {
    console.error('Erro:', err?.message || err);
  }
}

dumpAll310Fields().catch(console.error);
