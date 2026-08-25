import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function queryCalculatedFields() {
  const gateway = new SankhyaGateway(new ConfigService());
  console.log('=== Consultando Campos Calculados (EXPRESSAO IS NOT NULL) em TGFPAR ===\n');

  const sql = `
    SELECT
        CAM.NOMECAMPO,
        CAM.DESCRCAMPO,
        CAM.TIPCAMPO,
        CAM.EXPRESSAO
    FROM TDDCAM CAM
    WHERE CAM.NOMETAB = 'TGFPAR'
      AND CAM.EXPRESSAO IS NOT NULL
    ORDER BY CAM.NOMECAMPO
  `;

  try {
    const res = await gateway.executeQuery(sql);
    console.log(`Encontrados ${res.length} campos calculados em TGFPAR:\n`);
    console.table(res);
  } catch (err: any) {
    console.error('Erro ao consultar campos calculados:', err?.message || err);
  }
}

queryCalculatedFields().catch(console.error);
