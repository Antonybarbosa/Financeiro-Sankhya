import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function queryExactEntregaColumns() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Buscando colunas CEPENTREGA, CODBAIENTREGA, CODCIDENTREGA, CODENDENTREGA, NUMENTREGA no Dicionário ===\n');

  const names = [
    'CEPENTREGA',
    'CODBAIENTREGA',
    'CODCIDENTREGA',
    'CODENDENTREGA',
    'DTALTER',
    'NUMENTREGA',
    'COMPLEMENTOENTREGA',
  ];

  const sql = `
    SELECT
        CAM.NOMETAB,
        CAM.NOMECAMPO,
        CAM.DESCRCAMPO,
        CAM.TIPCAMPO
    FROM TDDCAM CAM
    WHERE UPPER(CAM.NOMECAMPO) IN ('${names.join("','")}')
       OR UPPER(CAM.NOMECAMPO) LIKE '%ENTREGA%'
    ORDER BY CAM.NOMETAB, CAM.NOMECAMPO
  `;

  try {
    const list = await gateway.executeQuery(sql);
    console.log(`Colunas encontradas (${list.length}):`);
    console.table(list);
  } catch (err: any) {
    console.error('Erro:', err?.message || err);
  }
}

queryExactEntregaColumns().catch(console.error);
