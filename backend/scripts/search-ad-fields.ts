import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function searchAdFields() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Buscando TODOS os campos customizados AD_* na TGFPAR ===\n');

  const sql = `
    SELECT
        CAM.NUCAMPO,
        CAM.NOMECAMPO,
        CAM.DESCRCAMPO,
        CAM.TIPCAMPO
    FROM TDDCAM CAM
    WHERE CAM.NOMETAB = 'TGFPAR'
      AND CAM.NOMECAMPO LIKE 'AD_%'
    ORDER BY CAM.NOMECAMPO
  `;

  try {
    const res = await gateway.executeQuery(sql);
    console.table(res);
  } catch (err: any) {
    console.error('Erro na busca:', err?.message || err);
  }
}

searchAdFields().catch(console.error);
