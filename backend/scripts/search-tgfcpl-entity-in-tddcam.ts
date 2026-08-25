import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function searchTgfcplEntity() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Buscando a entidade ligada a TGFCPL via TDDCAM ===\n');

  const sql = `
    SELECT DISTINCT CAM.NOMETAB, CAM.NOMECAMPO
    FROM TDDCAM CAM
    WHERE CAM.NOMETAB LIKE '%CPL%' OR CAM.NOMECAMPO = 'NUMENTREGA'
  `;

  try {
    const list = await gateway.executeQuery(sql);
    console.table(list);
  } catch (err: any) {
    console.error('Erro:', err?.message || err);
  }
}

searchTgfcplEntity().catch(console.error);
