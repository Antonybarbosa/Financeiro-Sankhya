import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function scanAllTgfparDeliveryFields() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Varrendo TODOS os 310 campos da TGFPAR no TDDCAM ===\n');

  const sql = `
    SELECT
        CAM.NUCAMPO,
        CAM.NOMECAMPO,
        CAM.DESCRCAMPO,
        CAM.TIPCAMPO
    FROM TDDCAM CAM
    WHERE CAM.NOMETAB = 'TGFPAR'
    ORDER BY CAM.NOMECAMPO
  `;

  try {
    const list = await gateway.executeQuery(sql);
    console.log(`Total de campos na TGFPAR: ${list.length}`);

    // Filtrar campos que contêm END, COB, ENT, BAI, CID, CEP, RUA, LOGR, NUM, COMPL, LAT, LONG
    const filtered = list.filter((c: any) => {
      const name = (c.NOMECAMPO || '').toUpperCase();
      const desc = (c.DESCRCAMPO || '').toUpperCase();
      return (
        name.includes('END') ||
        name.includes('ENT') ||
        name.includes('BAI') ||
        name.includes('CID') ||
        name.includes('CEP') ||
        name.includes('RUA') ||
        name.includes('LOGR') ||
        name.includes('NUM') ||
        name.includes('COMPL') ||
        name.includes('LAT') ||
        name.includes('LONG') ||
        desc.includes('ENTREGA') ||
        desc.includes('ENDEREÇO') ||
        desc.includes('BAIRRO') ||
        desc.includes('CIDADE') ||
        desc.includes('CEP')
      );
    });

    console.log(`\nCampos de Endereço/Entrega encontrados (${filtered.length}):`);
    console.table(filtered);
  } catch (err: any) {
    console.error('Erro ao varrer TDDCAM:', err?.message || err);
  }
}

scanAllTgfparDeliveryFields().catch(console.error);
