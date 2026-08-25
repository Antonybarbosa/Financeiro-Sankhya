import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function queryBancos() {
  const gateway = new SankhyaGateway(new ConfigService());
  console.log('=== Consultando TSIBCO (Tabela de Bancos do Sankhya) ===\n');

  const sql = `
    SELECT CODBCO, NOMEBCO
    FROM TSIBCO
    WHERE ROWNUM <= 20
    ORDER BY NOMEBCO
  `;

  try {
    const res = await gateway.executeQuery(sql);
    console.table(res);
  } catch (err: any) {
    console.error('Erro ao consultar TSIBCO:', err?.message || err);
  }
}

queryBancos().catch(console.error);
