import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function queryVend() {
  const gateway = new SankhyaGateway(new ConfigService());
  console.log('=== Consultando TGFVEN (Vendedores do Sankhya) ===\n');

  const sql = `
    SELECT CODVEND, APELIDO
    FROM TGFVEN
    WHERE ROWNUM <= 10
    ORDER BY APELIDO
  `;

  try {
    const res = await gateway.executeQuery(sql);
    console.table(res);
  } catch (err: any) {
    console.error('Erro ao consultar TGFVEN:', err?.message || err);
  }
}

queryVend().catch(console.error);
