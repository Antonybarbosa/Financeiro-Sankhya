import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function bootstrap() {
  const gateway = new SankhyaGateway(new ConfigService());

  try {
    // 1. Colunas reais da TSIANX
    const cols = await gateway.executeQuery(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM ALL_TAB_COLUMNS
      WHERE TABLE_NAME = 'TSIANX'
      ORDER BY COLUMN_ID
    `);
    console.log('=== TSIANX COLUMNS ===');
    cols.forEach((c: any) => console.log(`${c.COLUMN_NAME} (${c.DATA_TYPE})`));

    // 2. Amostra de anexos nativos (criados pela UI do Sankhya) vs nossos
    const sample = await gateway.executeQuery(`
      SELECT NUATTACH, NOMEINSTANCIA, PKREGISTRO, NOMEARQUIVO, CHAVEARQUIVO,
             DESCRICAO, RESOURCEID, TIPOAPRES, TIPOACESSO, CODUSU,
             TO_CHAR(DHCAD, 'DD/MM/YYYY HH24:MI') AS DHCAD
      FROM TSIANX
      ORDER BY NUATTACH DESC
    `);
    console.log('\n=== TSIANX SAMPLE (ultimos 25) ===');
    (sample as any[]).slice(0, 25).forEach((r) => console.log(JSON.stringify(r)));
  } catch (err: any) {
    console.error('Probe failed:', err?.message || err);
  }
}

bootstrap();
