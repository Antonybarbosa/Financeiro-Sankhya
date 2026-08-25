import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function queryATT() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Consultando campos da tabela TGFATT (Contatos / Endereços de Entrega do Parceiro) ===\n');

  const sql = `
    SELECT
        CAM.NOMECAMPO,
        CAM.DESCRCAMPO,
        CAM.TIPCAMPO
    FROM TDDCAM CAM
    WHERE CAM.NOMETAB = 'TGFATT'
    ORDER BY CAM.NOMECAMPO
  `;

  try {
    const res = await gateway.executeQuery(sql);
    console.log(`Encontrados ${res.length} campos na TGFATT:\n`);
    console.table(res);
  } catch (err: any) {
    console.error('Erro ao consultar TGFATT:', err?.message || err);
  }
}

queryATT().catch(console.error);
