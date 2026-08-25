import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testTgfcttColumnsRaw() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Testando colunas da tabela TGFCTT via SELECT * ===\n');

  try {
    const list = await gateway.executeQuery(`
      SELECT *
      FROM TGFCTT
      WHERE ROWNUM = 1
    `);
    console.log('Colunas reais da TGFCTT:');
    if (list.length > 0) {
      console.log(Object.keys(list[0]));
    }
  } catch (err: any) {
    console.error('Erro:', err?.message || err);
  }
}

testTgfcttColumnsRaw().catch(console.error);
