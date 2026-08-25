import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function searchDeliveryColumns() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Buscando colunas de entrega (CEP, Endereço, Número, Bairro, Cidade, Latitude, Longitude) na TGFPAR e TGFCTT ===\n');

  const sql = `
    SELECT
        CAM.NOMETAB,
        CAM.NOMECAMPO,
        CAM.DESCRCAMPO,
        CAM.TIPCAMPO
    FROM TDDCAM CAM
    WHERE CAM.NOMETAB IN ('TGFPAR', 'TGFCTT')
      AND (
        UPPER(CAM.NOMECAMPO) LIKE '%LAT%'
        OR UPPER(CAM.NOMECAMPO) LIKE '%LONG%'
        OR UPPER(CAM.DESCRCAMPO) LIKE '%LATITUDE%'
        OR UPPER(CAM.DESCRCAMPO) LIKE '%LONGITUDE%'
        OR UPPER(CAM.DESCRCAMPO) LIKE '%ENTREGA%'
      )
    ORDER BY CAM.NOMETAB, CAM.NOMECAMPO
  `;

  try {
    const res = await gateway.executeQuery(sql);
    console.table(res);
  } catch (err: any) {
    console.error('Erro na busca:', err?.message || err);
  }
}

searchDeliveryColumns().catch(console.error);
