import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function queryTGFCPL() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Consultando TODOS os campos da tabela TGFCPL (Complemento do Parceiro) ===\n');

  const sql = `
    SELECT
        CAM.NUCAMPO,
        CAM.NOMECAMPO,
        CAM.DESCRCAMPO,
        CAM.TIPCAMPO
    FROM TDDCAM CAM
    WHERE CAM.NOMETAB = 'TGFCPL'
    ORDER BY CAM.NOMECAMPO
  `;

  try {
    const list = await gateway.executeQuery(sql);
    console.log(`Encontrados ${list.length} campos na TGFCPL:`);
    console.table(list);
  } catch (err: any) {
    console.error('Erro ao consultar TGFCPL:', err?.message || err);
  }
}

queryTGFCPL().catch(console.error);
