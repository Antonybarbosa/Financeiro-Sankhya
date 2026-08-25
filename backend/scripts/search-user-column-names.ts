import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function searchUserColumnNames() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Buscando colunas especificadas pelo usuário em TODAS as tabelas ===\n');

  const names = [
    'CEPENTREGA',
    'CODBAIENTREGA',
    'CODCIDENTREGA',
    'CODENDENTREGA',
    'NUMENTREGA',
    'COMPLEMENTOENTREGA',
    'AD_CEPENTREGA',
    'AD_CODBAIENTREGA',
    'AD_CODCIDENTREGA',
    'AD_CODENDENTREGA',
    'AD_NUMENTREGA',
  ];

  const sql = `
    SELECT
        CAM.NOMETAB,
        CAM.NOMECAMPO,
        CAM.DESCRCAMPO,
        CAM.TIPCAMPO
    FROM TDDCAM CAM
    WHERE UPPER(CAM.NOMECAMPO) IN ('${names.join("','")}')
    ORDER BY CAM.NOMETAB, CAM.NOMECAMPO
  `;

  try {
    const list = await gateway.executeQuery(sql);
    console.log(`Resultado da busca exata (${list.length}):`);
    console.table(list);
  } catch (err: any) {
    console.error('Erro:', err?.message || err);
  }
}

searchUserColumnNames().catch(console.error);
