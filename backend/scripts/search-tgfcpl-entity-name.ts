import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function searchTgfcplEntityName() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Buscando Nome da Entidade do Sankhya para a tabela TGFCPL em TDDENT ===\n');

  const sql = `
    SELECT NOMEENT, DESCRICAO, NOMETAB
    FROM TDDENT
    WHERE UPPER(NOMETAB) = 'TGFCPL'
  `;

  try {
    const list = await gateway.executeQuery(sql);
    console.log(`Entidade(s) encontrada(s):`);
    console.table(list);
  } catch (err: any) {
    console.error('Erro:', err?.message || err);
  }
}

searchTgfcplEntityName().catch(console.error);
