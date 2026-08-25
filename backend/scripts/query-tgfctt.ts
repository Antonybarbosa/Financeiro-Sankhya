import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function queryTGFCTT() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Consultando campos da tabela TGFCTT (Contatos do Parceiro) ===\n');

  const sql = `
    SELECT
        CAM.NOMECAMPO,
        CAM.DESCRCAMPO,
        CAM.TIPCAMPO
    FROM TDDCAM CAM
    WHERE CAM.NOMETAB = 'TGFCTT'
    ORDER BY CAM.NOMECAMPO
  `;

  try {
    const res = await gateway.executeQuery(sql);
    console.log(`Encontrados ${res.length} campos na TGFCTT:\n`);
    console.table(res);
  } catch (err: any) {
    console.error('Erro ao consultar TGFCTT:', err?.message || err);
  }
}

queryTGFCTT().catch(console.error);
