import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function searchEntregaFields() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Buscando campos de ENDEREÇO DE ENTREGA na TGFPAR ===\n');

  const sql = `
    SELECT
        CAM.NUCAMPO,
        CAM.NOMECAMPO,
        CAM.DESCRCAMPO,
        CAM.TIPCAMPO
    FROM TDDCAM CAM
    WHERE CAM.NOMETAB = 'TGFPAR'
      AND (
        UPPER(CAM.NOMECAMPO) LIKE '%ENTR%'
        OR UPPER(CAM.NOMECAMPO) LIKE '%ENT%'
        OR UPPER(CAM.DESCRCAMPO) LIKE '%ENTREGA%'
      )
    ORDER BY CAM.NOMECAMPO
  `;

  try {
    const res = await gateway.executeQuery(sql);
    console.log(`Encontrados ${res.length} campos de entrega em TGFPAR:\n`);
    console.table(res);
  } catch (err: any) {
    console.error('Erro ao buscar campos de entrega:', err?.message || err);
  }
}

searchEntregaFields().catch(console.error);
