import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function searchAllAddressFields() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Buscando todos os campos de Endereço / Entrega / Cobrança na TGFPAR ===\n');

  const sql = `
    SELECT
        CAM.NUCAMPO,
        CAM.NOMECAMPO,
        CAM.DESCRCAMPO,
        CAM.TIPCAMPO
    FROM TDDCAM CAM
    WHERE CAM.NOMETAB = 'TGFPAR'
      AND (
        UPPER(CAM.NOMECAMPO) LIKE '%END%'
        OR UPPER(CAM.NOMECAMPO) LIKE '%BAI%'
        OR UPPER(CAM.NOMECAMPO) LIKE '%CID%'
        OR UPPER(CAM.NOMECAMPO) LIKE '%CEP%'
        OR UPPER(CAM.NOMECAMPO) LIKE '%LOGR%'
        OR UPPER(CAM.NOMECAMPO) LIKE '%NUM%'
        OR UPPER(CAM.DESCRCAMPO) LIKE '%ENDEREÇO%'
        OR UPPER(CAM.DESCRCAMPO) LIKE '%ENTREGA%'
        OR UPPER(CAM.DESCRCAMPO) LIKE '%COBRANÇA%'
      )
    ORDER BY CAM.NOMECAMPO
  `;

  try {
    const res = await gateway.executeQuery(sql);
    console.log(`Encontrados ${res.length} campos correspondentes em TGFPAR:\n`);
    console.table(res);
  } catch (err: any) {
    console.error('Erro na busca:', err?.message || err);
  }
}

searchAllAddressFields().catch(console.error);
